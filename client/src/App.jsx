import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button, Form } from 'react-bootstrap';

function App() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const videoRef = useRef(null); // Video element reference
  const canvasRef = useRef(null); // Canvas element reference

  const [showModal, setShowModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  let userLocation = null;

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
          setSelectedLocation(clickedLatLng);
          setShowModal(true);
        } else {
          alert('You can only place markers within 500 meters of your location.');
        }
      });
    }
  }, []);

  // Open Camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (error) {
      alert('Camera access denied or unavailable.');
    }
  };

  // Capture Image & Turn Off Camera
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

    // Stop the camera stream immediately
    stopCamera();
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  // Handle Image Upload
  const handleImageUpload = (event) => {
    setImage(URL.createObjectURL(event.target.files[0]));
  };

  const handleSubmit = () => {
    if (selectedLocation && image && caption && mapInstance.current) {
      L.marker(selectedLocation)
        .addTo(mapInstance.current)
        .bindPopup(`<img src='${image}' width='100px' /><br/><strong>${caption}</strong>`)
        .openPopup();

      setShowModal(false);
      setImage(null);
      setCaption('');
    }
  };

  return (
    <>
      <div style={{ height: '100vh', width: '100vw' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
      </div>

      {/* Modal for adding image and caption */}
      <Modal show={showModal} onHide={() => { setShowModal(false); stopCamera(); }}>
        <Modal.Header closeButton>
          <Modal.Title>Add a Marker</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formImage">
              <Form.Label>Upload Image or Open Camera</Form.Label>
              <Button variant="secondary" onClick={openCamera}>Open Camera</Button>
              <Button variant="primary" onClick={captureImage} disabled={!cameraActive}>Capture Image</Button>
              <Form.Control type="file" accept="image/*" onChange={handleImageUpload} />

              {/* Display Camera View Inside Modal */}
              {cameraActive && (
                <video ref={videoRef} autoPlay style={{ width: '100%', marginTop: '10px' }} />
              )}

              {/* Hidden Canvas for Capturing Image */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Display Captured or Uploaded Image */}
              {image && (
                <img src={image} alt="Selected" style={{ width: '100px', marginTop: '10px' }} />
              )}
            </Form.Group>

            <Form.Group controlId="formCaption">
              <Form.Label>Enter Caption</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowModal(false); stopCamera(); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Add Marker
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default App;