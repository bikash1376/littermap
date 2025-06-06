import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button, Form, Alert, Navbar, Nav } from 'react-bootstrap';
import { supabase, uploadImage, saveMarker, fetchMarkers } from './lib/supabase';
import AuthModal from './components/AuthModal';

function App() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markers, setMarkers] = useState([]);
  
  let userLocation = null;

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load existing markers
  useEffect(() => {
    loadMarkers();
  }, []);

  const loadMarkers = async () => {
    try {
      const markersData = await fetchMarkers();
      setMarkers(markersData);
      
      // Add markers to map
      if (mapInstance.current) {
        markersData.forEach(marker => {
          L.marker([marker.latitude, marker.longitude])
            .addTo(mapInstance.current)
            .bindPopup(`
              <div style="text-align: center;">
                <img src='${marker.image_url}' style='width: 150px; height: auto; border-radius: 8px;' />
                <br/>
                <strong style="margin-top: 8px; display: block;">${marker.caption}</strong>
                <small style="color: #666; display: block; margin-top: 4px;">
                  ${new Date(marker.created_at).toLocaleDateString()}
                </small>
              </div>
            `);
        });
      }
    } catch (error) {
      console.error('Error loading markers:', error);
    }
  };

  useEffect(() => {
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([20.3937, 78.9629], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstance.current);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          userLocation = [latitude, longitude];

          mapInstance.current.setView(userLocation, 15);
          L.marker(userLocation)
            .addTo(mapInstance.current)
            .bindPopup('You are here')
            .openPopup();
        });
      }

      mapInstance.current.on('click', (e) => {
        if (!userLocation) return;

        const clickedLatLng = e.latlng;
        const distance = mapInstance.current.distance(userLocation, clickedLatLng);

        if (distance <= 500) {
          if (!user) {
            setShowAuthModal(true);
            return;
          }
          setSelectedLocation(clickedLatLng);
          setShowModal(true);
        } else {
          alert('You can only place markers within 500 meters of your location.');
        }
      });

      // Load markers after map is initialized
      loadMarkers();
    }
  }, [user]);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setError('');
    } catch (error) {
      setError('Camera access denied or unavailable.');
    }
  };

  const captureImage = () => {
    if (!cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/png');
    setImage(imageData);
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedLocation || !image || !caption.trim() || !user) {
      setError('Please fill in all fields and ensure you are signed in.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload image to Supabase Storage
      const imageUrl = await uploadImage(image, user.id);
      
      // Save marker to database
      const newMarker = await saveMarker(
        selectedLocation.lat,
        selectedLocation.lng,
        imageUrl,
        caption.trim(),
        user.id
      );

      // Add marker to map
      L.marker([selectedLocation.lat, selectedLocation.lng])
        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="text-align: center;">
            <img src='${imageUrl}' style='width: 150px; height: auto; border-radius: 8px;' />
            <br/>
            <strong style="margin-top: 8px; display: block;">${caption}</strong>
            <small style="color: #666; display: block; margin-top: 4px;">
              ${new Date().toLocaleDateString()}
            </small>
          </div>
        `)
        .openPopup();

      // Update markers state
      setMarkers(prev => [newMarker, ...prev]);

      // Reset form
      setShowModal(false);
      setImage(null);
      setCaption('');
      setSelectedLocation(null);
    } catch (error) {
      setError('Failed to save marker. Please try again.');
      console.error('Error saving marker:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const closeModal = () => {
    setShowModal(false);
    setImage(null);
    setCaption('');
    setError('');
    stopCamera();
  };

  return (
    <>
      {/* Navigation Bar */}
      <Navbar bg="dark" variant="dark" className="px-3" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Navbar.Brand>Location Markers</Navbar.Brand>
        <Nav className="ms-auto">
          {user ? (
            <>
              <Nav.Text className="me-3">Welcome, {user.email}</Nav.Text>
              <Button variant="outline-light" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button variant="outline-light" size="sm" onClick={() => setShowAuthModal(true)}>
              Sign In
            </Button>
          )}
        </Nav>
      </Navbar>

      {/* Map Container */}
      <div style={{ height: '100vh', width: '100vw', paddingTop: '56px' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        show={showAuthModal}
        onHide={() => setShowAuthModal(false)}
        onAuthSuccess={(user) => {
          setUser(user);
          setShowAuthModal(false);
        }}
      />

      {/* Add Marker Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add a Marker</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Capture or Upload Image</Form.Label>
              <div className="d-flex gap-2 mb-2">
                <Button 
                  variant="secondary" 
                  onClick={openCamera}
                  disabled={cameraActive}
                >
                  {cameraActive ? 'Camera Active' : 'Open Camera'}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={captureImage} 
                  disabled={!cameraActive}
                >
                  Capture Image
                </Button>
              </div>
              
              <Form.Control 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="mb-2"
              />

              {/* Camera View */}
              {cameraActive && (
                <div className="mb-3">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }} 
                  />
                </div>
              )}

              {/* Hidden Canvas */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Image Preview */}
              {image && (
                <div className="text-center">
                  <img 
                    src={image} 
                    alt="Selected" 
                    style={{ width: '200px', height: 'auto', borderRadius: '8px' }} 
                  />
                </div>
              )}
            </Form.Group>

            <Form.Group>
              <Form.Label>Caption</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a caption for your marker"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
              />
              <Form.Text className="text-muted">
                {caption.length}/200 characters
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={loading || !image || !caption.trim()}
          >
            {loading ? 'Saving...' : 'Add Marker'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default App;