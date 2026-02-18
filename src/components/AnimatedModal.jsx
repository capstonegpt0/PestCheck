import React, { useEffect, useState } from 'react';

/**
 * AnimatedModal - wraps modal content with backdrop fade + content slide-up animation.
 * 
 * Usage:
 *   <AnimatedModal isOpen={showModal} onClose={() => setShowModal(false)} zIndex={50}>
 *     <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
 *       ... modal content ...
 *     </div>
 *   </AnimatedModal>
 * 
 * Props:
 *   isOpen    - boolean controlling visibility
 *   onClose   - called when backdrop is clicked
 *   children  - the modal panel content
 *   zIndex    - optional z-index (default: 50)
 *   className - optional extra classes for the content wrapper
 */
const AnimatedModal = ({ isOpen, onClose, children, zIndex = 50, className = '' }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to allow DOM paint before triggering enter animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationClass('modal-enter');
        });
      });
    } else if (shouldRender) {
      setAnimationClass('modal-exit');
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
      setAnimationClass('');
    }
  };

  if (!shouldRender) return null;

  const zStyle = typeof zIndex === 'number' ? { zIndex } : { zIndex: 50 };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${animationClass}`}
      style={zStyle}
      onAnimationEnd={handleAnimationEnd}
    >
      {/* Backdrop */}
      <div
        className="modal-backdrop-layer absolute inset-0 bg-black"
        onClick={onClose}
      />
      {/* Content */}
      <div className={`modal-content-layer relative ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default AnimatedModal;