import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Invoice } from '../types';
import { paymentsAPI } from '../services/api';

interface PaymentFormProps {
  invoice: Invoice;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
  onClose: () => void;
}

interface PaymentFormInnerProps {
  invoice: Invoice;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
  onClose: () => void;
}

const PaymentFormInner: React.FC<PaymentFormInnerProps> = ({
  invoice,
  onPaymentSuccess,
  onPaymentError,
  onClose
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'checkout'>('checkout');

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const { client_secret } = await paymentsAPI.createPaymentIntent({
        invoice_id: invoice.id
      });

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: invoice.customer_name || 'Customer',
            email: invoice.customer_email || undefined,
          },
        },
      });

      if (error) {
        onPaymentError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        onPaymentSuccess();
      }
    } catch (error: any) {
      onPaymentError(error.response?.data?.message || error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutPayment = async () => {
    setLoading(true);

    try {
      const baseUrl = window.location.origin;
      const { url } = await paymentsAPI.createCheckoutSession({
        invoice_id: invoice.id,
        success_url: `${baseUrl}/payment-success?invoice_id=${invoice.id}`,
        cancel_url: `${baseUrl}/payment-cancelled?invoice_id=${invoice.id}`
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      onPaymentError(error.response?.data?.message || error.message || 'Failed to create checkout session');
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Pay Invoice</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Invoice Details */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Invoice #{invoice.invoice_number}</span>
            <span className="text-lg font-bold">${invoice.total_amount.toFixed(2)}</span>
          </div>
          <p className="text-sm text-gray-600">{invoice.title}</p>
          {invoice.customer_name && (
            <p className="text-sm text-gray-600">Customer: {invoice.customer_name}</p>
          )}
        </div>

        {/* Payment Method Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="checkout"
                checked={paymentMethod === 'checkout'}
                onChange={(e) => setPaymentMethod(e.target.value as 'checkout')}
                className="mr-2"
              />
              <span>Stripe Checkout (Recommended)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value as 'card')}
                className="mr-2"
              />
              <span>Credit Card</span>
            </label>
          </div>
        </div>

        {paymentMethod === 'card' ? (
          <form onSubmit={handleCardPayment}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Information
              </label>
              <div className="p-3 border border-gray-300 rounded-md">
                <CardElement options={cardElementOptions} />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!stripe || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Pay $${invoice.total_amount.toFixed(2)}`}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You'll be redirected to Stripe's secure checkout page to complete your payment.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckoutPayment}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Redirecting...' : `Pay $${invoice.total_amount.toFixed(2)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const { publishable_key } = await paymentsAPI.getPublicKey();
        const stripe = await loadStripe(publishable_key);
        setStripePromise(Promise.resolve(stripe));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to initialize payment system');
      } finally {
        setLoading(false);
      }
    };

    initializeStripe();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading payment system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.1 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={props.onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return null;
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner {...props} />
    </Elements>
  );
};

export default PaymentForm; 