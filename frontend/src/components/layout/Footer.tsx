import React from 'react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-muted/50 py-12 mt-auto">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-xl font-bold text-primary-700 mb-4">GGH</h3>
          <p className="text-muted-foreground text-sm">
            Wholesale groceries, delivered to your doorstep. جملة لحد البيت
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/search" className="hover:text-primary">All Products</Link></li>
            <li><Link href="/deals" className="hover:text-primary">Deals</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/contact" className="hover:text-primary">Help Center</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
