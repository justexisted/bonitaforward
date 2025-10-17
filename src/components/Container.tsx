/**
 * Container component for consistent layout spacing
 * 
 * Provides consistent container styling with padding and max-width
 * Used across multiple components for uniform layout
 * 
 * @param children - React children to render inside the container
 * @param className - Optional additional CSS classes
 */
interface ContainerProps {
  children: React.ReactNode
  className?: string
}

export default function Container({ children, className = '' }: ContainerProps) {
  return <div className={`container-px mx-auto max-w-6xl ${className}`}>{children}</div>
}
