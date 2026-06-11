import { render, screen } from '@testing-library/react'
import { Card, CardTitle, CardHeader, CardBody } from '../Card'

describe('Card', () => {
  it('renders card with children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies default variant styles', () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('card-mobile', 'bg-white')
  })

  it('applies elevated variant styles', () => {
    const { container } = render(<Card variant="elevated">Content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)]')
  })

  it('applies no padding when padding is none', () => {
    const { container } = render(<Card padding="none">Content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('!p-0')
  })
})

describe('CardTitle', () => {
  it('renders title text', () => {
    render(<CardTitle>Test Title</CardTitle>)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders as h3 element', () => {
    const { container } = render(<CardTitle>Title</CardTitle>)
    const heading = container.querySelector('h3')
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Title')
  })

  it('applies mobile-first typography', () => {
    render(<CardTitle>Title</CardTitle>)
    const title = screen.getByText('Title')
    expect(title).toHaveClass('text-mobile-base', 'md:text-mobile-xl', 'font-bold')
  })
})

describe('CardHeader', () => {
  it('renders header content', () => {
    render(<CardHeader>Header content</CardHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('CardBody', () => {
  it('renders body content', () => {
    render(<CardBody>Body content</CardBody>)
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })
})
