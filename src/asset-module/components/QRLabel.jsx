import { QRCodeSVG } from 'qrcode.react';
import './QRLabel.css';

export default function QRLabel({ asset, signature }) {
  if (!asset || !signature) return null;

  const baseUrl = window.location.origin + window.location.pathname;
  const encodedId = encodeURIComponent(asset.id);
  const qrUrl = `${baseUrl}#/asset/${encodedId}.${signature}`;

  return (
    <div id="print-qr-label" className="qr-label-card">
      <div className="qr-label-header">
        <h3 className="label-brand">AV Dynamic Support</h3>
        <span className="label-scan-text">SCAN FOR SERVICE</span>
      </div>
      
      <div className="qr-label-body">
        <div className="qr-code-wrapper">
          <QRCodeSVG 
            value={qrUrl} 
            size={100} 
            level="H" 
            includeMargin={true}
          />
        </div>
        
        <div className="qr-label-details">
          <div className="detail-row">
            <span className="label-key">Client:</span>
            <span className="label-val">{asset.companyName || asset.refCode}</span>
          </div>
          <div className="detail-row">
            <span className="label-key">Asset ID:</span>
            <span className="label-val fw-bold">{asset.id}</span>
          </div>
          <div className="detail-row">
            <span className="label-key">Make/Model:</span>
            <span className="label-val">{asset.productMake} {asset.productModel}</span>
          </div>
          <div className="detail-row">
            <span className="label-key">Serial:</span>
            <span className="label-val">{asset.productSerial || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label-key">Location:</span>
            <span className="label-val">{asset.location} - {asset.roomName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
