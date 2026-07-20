import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary-900 mb-4">Gomla Go Home</h1>
        <p className="text-xl text-muted-foreground mb-8">Wholesale groceries, delivered to your doorstep.</p>
        <Button size="lg" className="text-lg">Shop Now</Button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle>Featured Deal {item}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Amazing savings on bulk items.</p>
              <Button variant="outline" className="w-full">View Deal</Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
