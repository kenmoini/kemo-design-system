import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityFeed, type ActivityItem } from './activity-feed'

const items: ActivityItem[] = [
  {
    id: 'a1',
    actor: 'Priya Shah',
    initials: 'PS',
    action: 'promoted checkout-api v2.14.0',
    when: '4m',
  },
  {
    id: 'a2',
    actor: 'Marcus Chen',
    initials: 'MC',
    action: 'started a canary for web-frontend',
    when: '22m',
  },
  {
    id: 'a3',
    actor: 'Sofia Reyes',
    initials: 'SR',
    action: 'resolved incident INC-412',
    when: '1h',
  },
]

describe('ActivityFeed', () => {
  it('renders each actor with initials, action and time', () => {
    render(<ActivityFeed items={items} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    for (const item of items) {
      expect(screen.getByText(item.actor)).toBeInTheDocument()
      expect(screen.getByText(item.initials)).toBeInTheDocument()
      expect(screen.getByText(item.when)).toBeInTheDocument()
    }
    expect(screen.getByText('resolved incident INC-412', { exact: false })).toBeInTheDocument()
  })
})
