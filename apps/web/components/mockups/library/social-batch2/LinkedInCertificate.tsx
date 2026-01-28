import React from 'react';
import { Award } from 'lucide-react';

interface LinkedInCertificateProps {
  certificateName?: string;
  issuedBy?: string;
  issueDate?: string;
  credentialId?: string;
}

export const LinkedInCertificate: React.FC<LinkedInCertificateProps> = ({
  certificateName = 'Certificate Name',
  issuedBy = 'Issuing Organization',
  issueDate = 'January 2026',
  credentialId = 'ABC123XYZ',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-center">
        <Award className="w-16 h-16 text-white mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">{certificateName}</h2>
        <p className="text-blue-100 text-sm">{issuedBy}</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Issued</p>
            <p className="text-sm font-semibold text-gray-900">{issueDate}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Credential ID</p>
            <p className="text-sm font-mono text-gray-900">{credentialId}</p>
          </div>
        </div>
        
        <button className="w-full mt-4 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-2 rounded text-sm">
          Show credential
        </button>
      </div>
    </div>
  );
};
