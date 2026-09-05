import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';
import Analyze from './pages/Analyze/Analyze';
import Results from './pages/Results/Results';
import History from './pages/History/History';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      {/* WCAG 2.4.1 Skip-to-content accessibility link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Core Forensic Routes Accessible Without Signing In */}
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/results" element={<Results />} />
        <Route path="/history" element={<History />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </AuthProvider>
  );
}

export default App;
