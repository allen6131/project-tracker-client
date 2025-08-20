import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Files from './pages/Files';
import Customers from './pages/Customers';
import CustomerContacts from './pages/CustomerContacts';
import CustomerDetail from './pages/CustomerDetail';
import Estimates from './pages/Estimates';
import Invoices from './pages/Invoices';
import InvoiceEdit from './pages/InvoiceEdit';
import EstimateEdit from './pages/EstimateEdit';
import InvoiceCreate from './pages/InvoiceCreate';
import EstimateCreate from './pages/EstimateCreate';
import RFIs from './pages/RFIs';
import Todos from './pages/Todos';
import CalendarPage from './pages/Calendar';
import Materials from './pages/Materials';
import Services from './pages/Services';
import Users from './pages/Users';
import Company from './pages/Company';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Projects />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/todos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Todos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CalendarPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/customers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/customers/:customerId/contacts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerContacts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/customers/:customerId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/estimates"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Estimates />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Invoices />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/invoices/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceCreate />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/invoices/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceEdit />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/rfis"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RFIs />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/estimates/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EstimateEdit />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/estimates/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EstimateCreate />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/materials"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Materials />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/services"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Services />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/users"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/company"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Company />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/projects/:id/files"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Files />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/payment-success"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentSuccess />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/payment-cancelled"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentCancelled />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Analytics />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
