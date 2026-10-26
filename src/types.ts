export type Priority = 'Regular' | 'Priority'

export type QueueEntry = {
  id: number
  patientName: string
  age: number
  contactNumber: string
  service: string
  priority: Priority
  status: string
  createdAt: string
}

export type NewQueueEntry = Pick<
  QueueEntry,
  'patientName' | 'age' | 'contactNumber' | 'service' | 'priority'
>
