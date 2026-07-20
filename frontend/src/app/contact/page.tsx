import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input placeholder="Your Name" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input type="email" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <Textarea placeholder="How can we help you?" rows={5} />
        </div>
        <Button size="lg">Send Message</Button>
      </form>
    </div>
  )
}
