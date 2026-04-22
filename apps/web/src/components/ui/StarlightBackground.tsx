import React from 'react';

export const StarlightBackground: React.FC = React.memo(() => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1502134249126-9f3755a50d78?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
        alt="Milky Way Galaxy"
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-auto object-cover opacity-30"
        style={{
          maskImage: 'radial-gradient(ellipse at center top, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center top, black 20%, transparent 70%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/10 via-transparent to-amber-500/10"></div>
    </div>
  );
});