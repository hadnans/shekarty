import React from 'react'

export default function OrdersPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Order History</h1>
      <div className="border p-6 rounded-lg text-center">
        <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
      </div>
    </div>
  )
}
