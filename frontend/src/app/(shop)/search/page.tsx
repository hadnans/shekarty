import React from 'react'

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border p-4 rounded-lg shadow-sm">
            <div className="aspect-square bg-muted mb-4 rounded-md"></div>
            <h3 className="font-semibold">Product {i + 1}</h3>
            <p className="text-primary-700 font-bold mt-2">£10.00</p>
          </div>
        ))}
      </div>
    </div>
  )
}
