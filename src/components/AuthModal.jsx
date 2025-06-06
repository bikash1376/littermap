import { useState } from 'react';
import { Modal, Button, Form, Alert, Tabs, Tab } from 'react-bootstrap';
import { supabase } from '../lib/supabase';

function AuthModal({ show, onHide, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('signin');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      onAuthSuccess(data.user);
      onHide();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        onAuthSuccess(data.user);
        onHide();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Authentication Required</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          Please sign in or create an account to save markers to the map.
        </p>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => {
            setActiveTab(k);
            resetForm();
          }}
          className="mb-3"
        >
          <Tab eventKey="signin" title="Sign In">
            <Form onSubmit={handleSignIn}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>
              <Button type="submit" variant="primary" disabled={loading} className="w-100">
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Form>
          </Tab>
          <Tab eventKey="signup" title="Sign Up">
            <Form onSubmit={handleSignUp}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Form.Text className="text-muted">
                  Password must be at least 6 characters long.
                </Form.Text>
              </Form.Group>
              <Button type="submit" variant="success" disabled={loading} className="w-100">
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
}

export default AuthModal;