import React from 'react'
import { Button } from '@/components/ui/button'

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-muted rounded-lg"></div>
        <div>
          <h1 className="text-3xl font-bold mb-4">Product {resolvedParams.handle}</h1>
          <p className="text-2xl font-bold text-primary-700 mb-6">£10.00</p>
          <p className="text-muted-foreground mb-8">
            Detailed description for product {resolvedParams.handle}. Great value wholesale item.
          </p>
          <Button size="lg" className="w-full md:w-auto">Add to Cart</Button>
        </div>
      </div>
    </div>
  )
}
