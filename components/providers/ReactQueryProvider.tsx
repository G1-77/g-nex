"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"

export default function ReactQueryProvider({
  children
}: {
  children: ReactNode
}) {
  const [queyClient] = useState(
    () => 
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 10,
            refetchOnWindowFocus: false
          }
        }
      })
  )
  
  return (
    <QueryClientProvider client={queyClient}>
      {children}
    </QueryClientProvider>
  )
}