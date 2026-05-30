import React from 'react';

// Minimal drop-in replacement for next/image when SSR/runtime issues occur.
// Accepts: src, alt, width, height, className, style, onClick
export default function RawImage({ src, alt = '', width, height, className = '', style = {}, onClick }) {
  const props = {
    src,
    alt,
    className,
    style,
    onClick,
  };
  if (width) props.width = width;
  if (height) props.height = height;
  // If src is an object (next/image fallback), try to resolve
  if (typeof src === 'object' && src?.src) props.src = src.src;

  return <img {...props} />;
}
