import React from 'react'
import './ShimmerWrapper.css'

function ShimmerWrapper({ children, className = '' }) {
  return (
    <div className={`shimmer-wrapper ${className}`}>
      <div className="shimmer-border">
        <div className="shimmer-border-inner" />
      </div>
      <div className="shimmer-content">
        {children}
      </div>
    </div>
  )
}

export default ShimmerWrapper