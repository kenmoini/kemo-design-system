'use client'
import { Table2, LineChart } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Box, Flex } from '../../styled-system/jsx'
import { Card, Icon, IconButton, Table, Text } from '../components/ui'
import type { TableData } from './types'

export interface ChartCardProps {
  title: string
  caption?: string
  table: TableData
  children: ReactNode
}

export function ChartCard({ title, caption, table, children }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Flex align="center" justify="space-between" gap="3">
          <Box>
            <Card.Title>{title}</Card.Title>
            {caption ? (
              <Text color="fg.muted" textStyle="sm">
                {caption}
              </Text>
            ) : null}
          </Box>
          <IconButton
            variant="plain"
            size="sm"
            aria-label={showTable ? 'View as chart' : 'View as table'}
            aria-pressed={showTable}
            onClick={() => setShowTable((v) => !v)}
          >
            <Icon>{showTable ? <LineChart /> : <Table2 />}</Icon>
          </IconButton>
        </Flex>
      </Card.Header>
      {/* A floor for a chart's empty state, low enough that short content (a status grid) does not
          leave a gap when cards stack in one column. */}
      <Card.Body minH="40">
        {showTable ? (
          <Table.Root>
            <Table.Head>
              <Table.Row>
                {table.columns.map((c) => (
                  <Table.Header key={c}>{c}</Table.Header>
                ))}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {table.rows.map((row, i) => (
                <Table.Row key={i}>
                  {row.map((v, j) => (
                    <Table.Cell
                      key={j}
                      textAlign={typeof v === 'number' ? 'end' : 'start'}
                      fontVariantNumeric={typeof v === 'number' ? 'tabular-nums' : undefined}
                    >
                      {v}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          children
        )}
      </Card.Body>
    </Card.Root>
  )
}
