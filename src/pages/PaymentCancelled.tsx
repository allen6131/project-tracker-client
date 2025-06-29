import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoicesAPI } from '../services/api';
import { Invoice } from '../types';

const PaymentCancelled: React.FC = () => {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invoiceId = searchParams.get('invoice_id');

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setError('No invoice ID provided');
        setLoading(false);
        return;
      }

      try {
        const invoiceResponse = await invoicesAPI.getInvoice(parseInt(invoiceId));
        setInvoice(invoiceResponse.invoice);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-xl font-bold text-gray-900">
                AmpTrack
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Cancelled Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-4">
          {/* Warning Icon */}
          <div className="text-orange-600 mb-6">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.1 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Cancelled Message */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Cancelled</h2>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled. No charges were made to your account.
          </p>

          {/* Invoice Details */}
          {invoice && !error && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Invoice Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-medium">#{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-medium">{invoice.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">${invoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                    {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                {invoice.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{invoice.customer_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 rounded-lg p-4 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {invoice && (
              <button
                onClick={() => {
                  // You can trigger payment modal here if needed
                  // For now, just redirect to invoices page
                  window.location.href = '/invoices';
                }}
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Payment Again
              </button>
            )}
            <Link
              to="/invoices"
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              View All Invoices
            </Link>
            <Link
              to="/dashboard"
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Go to Dashboard
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              You can try the payment again at any time. The invoice remains active and unpaid.
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled; 