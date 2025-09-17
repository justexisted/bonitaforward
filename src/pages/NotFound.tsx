import React from 'react';
import { Link } from 'react-router-dom';
import FuzzyText from '../components/FuzzyText';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Error with FuzzyText */}
        <div className="mb-8">
          <FuzzyText 
            fontSize={120}
            fontWeight="bold"
            fontFamily="Inter, sans-serif"
            color="#1e40af"
            baseIntensity={0.2} 
            hoverIntensity={0.5} 
            enableHover={true}
          >
            404
          </FuzzyText>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Oops! Page Not Found
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          The page you're looking for seems to have wandered off into the digital void. 
          Don't worry, even the best explorers sometimes take a wrong turn!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Fun Illustration or Additional Content */}
        <div className="mt-12 text-gray-500">
          <p className="text-sm">
            While you're here, why not explore our amazing local businesses?
          </p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link to="/category/real-estate" className="text-blue-600 hover:text-blue-800 underline">
              Real Estate
            </Link>
            <Link to="/category/home-services" className="text-blue-600 hover:text-blue-800 underline">
              Home Services
            </Link>
            <Link to="/category/health-wellness" className="text-blue-600 hover:text-blue-800 underline">
              Health & Wellness
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
