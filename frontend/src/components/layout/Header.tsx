import React from 'react'
import Link from 'next/link'
import { LanguageSwitcher } from '../navigation/LanguageSwitcher'
import { Button } from '../ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-primary-700">
            GGH
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/search" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Products
            </Link>
            <Link href="/deals" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Deals
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              About
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/cart">
            <Button variant="outline">Cart</Button>
          </Link>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
