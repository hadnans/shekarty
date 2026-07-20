import React from 'react'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <p className="text-muted-foreground">Your cart is empty.</p>
        </div>
        <div className="border p-6 rounded-lg h-fit">
          <h2 className="text-xl font-bold mb-4">Summary</h2>
          <div className="flex justify-between mb-4">
            <span>Total</span>
            <span className="font-bold">£0.00</span>
          </div>
          <Button className="w-full" disabled>Checkout</Button>
        </div>
      </div>
    </div>
  )
}
