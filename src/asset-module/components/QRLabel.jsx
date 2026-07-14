import { QRCodeSVG } from 'qrcode.react';
import './QRLabel.css';

export default function QRLabel({ asset, signature }) {
  if (!asset || !signature) return null;

  const assetId = asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.id || 'N/A';
  const company = asset.Company_Name || asset.COMPANY_NAME || asset.companyName || asset.refCode || 'N/A';
  const make = asset.ProductMake || asset.PRODUCTMAKE || asset.productMake || '';
  const model = asset.ProductModel || asset.PRODUCTMODEL || asset.productModel || 'Unknown';
  const serial = asset.ProductSerial || asset.PRODUCTSERIAL || asset.productSerial || 'N/A';
  const location = asset.Location || asset.LOCATION || asset.location || 'N/A';
  const roomName = asset.Room_Name || asset.ROOM_NAME || asset.roomName || '';

  const baseUrl = window.location.origin + window.location.pathname;
  const encodedId = encodeURIComponent(assetId);
  const qrUrl = `${baseUrl}#/asset/${encodedId}.${signature}`;

  return (
    <div
      id="print-label"
      className="qr-label-card"
    >
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '2px solid #000000',
        paddingBottom: '8px',
        marginBottom: '8px'
      }}>
        <div style={{ fontWeight: '900', fontSize: '18px', color: '#000000', lineHeight: '1.2' }}>
          AV Dynamic<br />ProSupport
        </div>
        <div style={{
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          textAlign: 'center'
        }}>
          SCAN FOR<br />SERVICE
        </div>
      </div>

      {/* Body Section */}
      <div style={{ 
        display: 'flex', 
        flex: 1,         /* This forces the body to fill all available space */
        gap: '0.05in',   /* Tighten the gap */
        overflow: 'hidden',
        alignItems: 'center' /* Centers content vertically in the available space */
      }}>
        
        {/* QR Code Container */}
        <div className="qr-code-wrapper" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '0.8in',
          height: '0.8in',
          flexShrink: 0
        }}>
          <QRCodeSVG 
            value={qrUrl} 
            size={75} /* Adjusted for 3x2in scale */
            level="H" 
            style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
          />
        </div>

        {/* Details Container - Now stretches to fill */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-evenly', /* Distributes text lines evenly */
          fontSize: '9pt', 
          color: '#000000',
          lineHeight: '1.1'
        }}>
          <div style={{ display: 'flex' }}>
            <strong style={{ width: '65px', flexShrink: 0 }}>Client:</strong>
            <span style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontWeight: '600'
            }}>
              {company}
            </span>
          </div>
          <div style={{ display: 'flex' }}>
            <strong style={{ width: '65px', flexShrink: 0 }}>Asset ID:</strong>
            <span style={{ fontWeight: '900' }}>{assetId}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <strong style={{ width: '65px', flexShrink: 0 }}>Model:</strong>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {make} {model}
            </span>
          </div>
          <div style={{ display: 'flex' }}>
            <strong style={{ width: '65px', flexShrink: 0 }}>Serial:</strong>
            <span>{serial}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <strong style={{ width: '65px', flexShrink: 0 }}>Location:</strong>
            <span style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {location} {roomName ? `(${roomName})` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
