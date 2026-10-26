import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createQueueEntry, deleteQueueEntry, getQueue, getQueueEntry } from './api'
import type { Priority, QueueEntry } from './types'
import './App.css'

const SERVICES = [
  'General Consultation',
  'Dental Check-up',
  'Laboratory',
  'Vaccination',
  'Prenatal Check-up',
]

type FormState = {
  patientName: string
  age: string
  contactNumber: string
  service: string
  priority: Priority
}

const EMPTY_FORM: FormState = {
  patientName: '',
  age: '',
  contactNumber: '',
  service: SERVICES[0],
  priority: 'Regular',
}

const timeFormatter = new Intl.DateTimeFormat('en-PH', {
  hour: 'numeric',
  minute: '2-digit',
})

function parseTimestamp(value: string) {
  const local = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  )

  if (local) {
    const [, month, day, year, hour, minute, second] = local
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? 0),
    )
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTime(value: string) {
  const date = parseTimestamp(value)
  return date ? timeFormatter.format(date) : '—'
}

function App() {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<QueueEntry | null>(null)
  const [searchMessage, setSearchMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setListError('')

    try {
      setEntries(await getQueue())
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Unable to load the queue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    getQueue()
      .then((data) => {
        if (active) {
          setEntries(data)
          setListError('')
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setListError(error instanceof Error ? error.message : 'Unable to load the queue.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!notice) {
      return
    }

    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = Number(searchId)

    if (!Number.isInteger(id) || id <= 0) {
      setSearchResult(null)
      setSearchMessage('Enter a valid queue number.')
      return
    }

    setSearching(true)
    setSearchMessage('')

    try {
      setSearchResult(await getQueueEntry(id))
    } catch (error) {
      setSearchResult(null)
      setSearchMessage(error instanceof Error ? error.message : 'Queue entry not found.')
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const patientName = form.patientName.trim()
    const age = Number(form.age)

    if (!patientName) {
      setNotice("Enter the patient's full name.")
      return
    }

    if (!Number.isInteger(age) || age < 0 || age > 120) {
      setNotice('Age must be a whole number between 0 and 120.')
      return
    }

    setSubmitting(true)

    try {
      const created = await createQueueEntry({
        patientName,
        age,
        contactNumber: form.contactNumber.trim(),
        service: form.service,
        priority: form.priority,
      })

      setEntries((current) => [...current, created])
      setForm(EMPTY_FORM)
      setNotice(`${created.patientName} was added as queue #${created.id}.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to add the patient.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(entry: QueueEntry) {
    const confirmed = window.confirm(
      `Remove ${entry.patientName} (queue #${entry.id}) from the list?`,
    )

    if (!confirmed) {
      return
    }

    setDeletingId(entry.id)

    try {
      await deleteQueueEntry(entry.id)
      setEntries((current) => current.filter((item) => item.id !== entry.id))

      if (searchResult?.id === entry.id) {
        setSearchResult(null)
        setSearchMessage('That queue entry was deleted.')
      }

      setNotice(`Queue #${entry.id} was removed.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete the entry.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <strong>Clinic Queue System</strong>
      </header>

      <main className="page">
        <div className="intro">
          <h1>Current queue</h1>
          <p>Add walk-in patients, search by queue number, and remove entries.</p>
        </div>

        <div className="layout">
          <section className="panel" aria-busy={loading}>
            <div className="panel-head">
              <h2>Queue</h2>
              <button
                className="button small"
                type="button"
                onClick={() => void loadEntries()}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {listError && (
              <div className="inline-alert" role="alert">
                <span>{listError}</span>
                <button className="link-button" type="button" onClick={() => void loadEntries()}>
                  Try again
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table>
                <caption className="sr-only">
                  Patients currently waiting in the clinic queue
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Queue</th>
                    <th scope="col">Patient</th>
                    <th scope="col">Service</th>
                    <th scope="col">Priority</th>
                    <th scope="col" className="optional">
                      Contact
                    </th>
                    <th scope="col" className="optional">
                      Queued
                    </th>
                    <th scope="col" className="action-col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && entries.length === 0 ? (
                    <tr>
                      <td className="table-message" colSpan={7}>
                        Loading the queue...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td className="table-message" colSpan={7}>
                        No patients in the queue yet.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.id}</td>
                        <td>
                          {entry.patientName}
                          <span className="subtext">{entry.age} years old</span>
                        </td>
                        <td>{entry.service}</td>
                        <td>{entry.priority}</td>
                        <td className="optional">{entry.contactNumber || '—'}</td>
                        <td className="optional">{formatTime(entry.createdAt)}</td>
                        <td className="action-col">
                          <button
                            className="button small"
                            type="button"
                            onClick={() => void handleDelete(entry)}
                            disabled={deletingId === entry.id}
                            aria-label={`Delete queue entry for ${entry.patientName}`}
                          >
                            {deletingId === entry.id ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="sidebar">
            <section className="panel">
              <div className="panel-head">
                <h2>Find a patient</h2>
              </div>

              <form className="form" onSubmit={handleSearch}>
                <label className="field">
                  <span>Queue number</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    placeholder="e.g. 3"
                    value={searchId}
                    onChange={(event) => setSearchId(event.target.value)}
                  />
                </label>
                <button className="button primary" type="submit" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="search-output" aria-live="polite">
                {searchResult ? (
                  <article className="result">
                    <div className="result-head">
                      <strong>#{searchResult.id}</strong>
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => {
                          setSearchResult(null)
                          setSearchId('')
                          setSearchMessage('')
                        }}
                      >
                        Clear
                      </button>
                    </div>
                    <p className="result-name">{searchResult.patientName}</p>
                    <p>
                      {searchResult.age} years old · {searchResult.service}
                    </p>
                    <p>
                      {searchResult.priority} · Queued at {formatTime(searchResult.createdAt)}
                    </p>
                  </article>
                ) : searchMessage ? (
                  <p className="search-message">{searchMessage}</p>
                ) : (
                  <p className="search-hint">Search results will appear here.</p>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Add a walk-in</h2>
              </div>

              <form className="form" onSubmit={handleAdd}>
                <label className="field">
                  <span>Patient name</span>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.patientName}
                    onChange={(event) => updateField('patientName', event.target.value)}
                    required
                  />
                </label>

                <div className="form-row">
                  <label className="field">
                    <span>Age</span>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      step="1"
                      placeholder="0"
                      value={form.age}
                      onChange={(event) => updateField('age', event.target.value)}
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Priority</span>
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        updateField('priority', event.target.value as Priority)
                      }
                    >
                      <option value="Regular">Regular</option>
                      <option value="Priority">Priority</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Contact number (optional)</span>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxxx"
                    value={form.contactNumber}
                    onChange={(event) => updateField('contactNumber', event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Service</span>
                  <select
                    value={form.service}
                    onChange={(event) => updateField('service', event.target.value)}
                  >
                    {SERVICES.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="button primary" type="submit" disabled={submitting}>
                  {submitting ? 'Adding patient...' : 'Add to queue'}
                </button>
              </form>
            </section>
          </aside>
        </div>
      </main>

      {notice && (
        <div className="toast" role="status" aria-live="polite">
          <span>{notice}</span>
          <button className="link-button" type="button" onClick={() => setNotice('')}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

export default App
