/**
 * QR Code Scanner Module
 * Provides functionality to scan QR codes and extract test IDs
 */

const QRScanner = {
  scriptLoaded: false,
  
  // Initialize QR scanner libraries
  async init() {
    if (this.scriptLoaded) return;
    
    // Load jsQR library
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = () => { this.scriptLoaded = true; };
    document.head.appendChild(script);
  },

  // Scan QR code from camera
  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      return stream;
    } catch (err) {
      throw new Error('Camera access denied. QR scan not available.');
    }
  },

  // Extract test ID from QR code content
  extractTestId(qrContent) {
    // QR contains full URL: https://alwynrajivs.github.io/Assessment-V1/index.html?test=TEST-XXXXX
    const url = new URL(qrContent);
    const testId = url.searchParams.get('test');
    if (testId && testId.match(/^TEST-[A-F0-9]{8}$/i)) {
      return testId;
    }
    // Fallback: if content is just the test ID
    if (qrContent.match(/^TEST-[A-F0-9]{8}$/i)) {
      return qrContent;
    }
    return null;
  },

  // Scan QR from uploaded file
  async scanFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          if (window.jsQR) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrData = window.jsQR(imageData.data, canvas.width, canvas.height);
            
            if (qrData) {
              const testId = this.extractTestId(qrData.data);
              if (testId) {
                resolve(testId);
              } else {
                reject(new Error('Invalid QR code - Test ID not found'));
              }
            } else {
              reject(new Error('No QR code detected in image'));
            }
          } else {
            reject(new Error('QR scanner library not loaded'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // Scan QR from camera stream (real-time)
  async scanFromCamera() {
    await this.init();
    const stream = await this.startCamera();
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.srcObject = stream;
      video.play();
      
      const scanInterval = setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          if (window.jsQR) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrData = window.jsQR(imageData.data, canvas.width, canvas.height);
            
            if (qrData) {
              clearInterval(scanInterval);
              stream.getTracks().forEach(track => track.stop());
              
              const testId = this.extractTestId(qrData.data);
              if (testId) {
                resolve(testId);
              } else {
                reject(new Error('Invalid QR code'));
              }
            }
          }
        }
      }, 100);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(scanInterval);
        stream.getTracks().forEach(track => track.stop());
        reject(new Error('QR scan timeout'));
      }, 30000);
    });
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QRScanner;
}
