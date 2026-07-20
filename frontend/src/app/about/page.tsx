import React from 'react'

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">About Gomla Go Home</h1>
      <div className="prose max-w-none">
        <p className="text-lg text-muted-foreground mb-4">
          Gomla Go Home is a wholesale grocery marketplace built for Egyptian households and small businesses.
        </p>
        <p>
          Instead of navigating crowded wholesale markets, haggling over bulk prices, and carrying heavy items, we bring the wholesale experience online.
        </p>
      </div>
    </div>
  )
}
