'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { PencilSimple } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { answerQuestion, removeQuestion } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { BusinessQuestion } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { formatMomentDay } from '@/views/manage/ui/ClientSheet/BirthdayField'
import styles from './ReviewsTab.module.css'

interface QuestionsPanelProps {
  slug: string
  questions: BusinessQuestion[] | null
  onChange: (questions: BusinessQuestion[]) => void
}

const ANSWER_FORM = 'question-answer'

// Questions from the business page, open ones first; an answer puts the question on the page.
export const QuestionsPanel = ({ slug, questions, onChange }: QuestionsPanelProps) => {
  const t = useT()
  const toast = useToast()
  const [editing, setEditing] = useState<BusinessQuestion | null>(null)
  const [text, setText] = useState('')

  if (!questions) return <Skeleton className={styles.skeleton} />
  if (questions.length === 0) {
    return (
      <EmptyState
        title={t('No questions yet')}
        text={t('Clients ask on the place page; the answer appears there and comes to Telegram.')}
      />
    )
  }

  const open = (question: BusinessQuestion) => {
    setEditing(question)
    setText(question.answer ?? '')
  }

  const handleAnswer = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    try {
      const saved = await answerQuestion(slug, editing.id, text.trim())
      onChange(questions.map((item) => (item.id === saved.id ? saved : item)))
      void refreshBusiness(slug)
      toast.show({
        title: saved.answer ? t('Reply published') : t('Answer removed'),
        type: 'success',
      })
      setEditing(null)
    } catch (answerError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(answerError),
        type: 'error',
      })
    }
  }

  const handleRemove = async () => {
    if (!editing) return
    try {
      await removeQuestion(slug, editing.id)
      onChange(questions.filter((item) => item.id !== editing.id))
      void refreshBusiness(slug)
      toast.show({ title: t('Question deleted') })
      setEditing(null)
    } catch (removeError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(removeError),
        type: 'error',
      })
    }
  }

  return (
    <>
      <ul className={styles.questions}>
        {questions.map((question) => (
          <li key={question.id} className={styles.questionItem}>
            <p className={styles.questionText}>{question.text}</p>
            <p className={styles.meta}>
              {question.authorName} · {formatMomentDay(question.createdAt, t)}
              {!question.answer && (
                <span className={styles.openMark}> · {t('awaiting an answer')}</span>
              )}
            </p>
            {question.answer && <p className={styles.answerText}>{question.answer}</p>}
            <button
              type='button'
              className={question.answer ? styles.replyEdit : styles.replyButton}
              onClick={() => open(question)}
            >
              {question.answer ? (
                <>
                  <PencilSimple aria-hidden />
                  {t('Change')}
                </>
              ) : (
                t('Answer')
              )}
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <Sheet
          title={t('Answer to the question')}
          onClose={() => setEditing(null)}
          action={{ label: t('Done'), form: ANSWER_FORM }}
        >
          <form id={ANSWER_FORM} className={styles.form} onSubmit={handleAnswer}>
            <p className={styles.quote}>
              {editing.authorName}: «{editing.text}»
            </p>
            <textarea
              aria-label={t('Reply')}
              className={styles.textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              rows={5}
            />
            <p className={styles.hint}>
              {t(
                'Everyone sees an answered question on the place page. An empty answer takes it down.',
              )}
            </p>
          </form>
          <HoldButton onConfirm={handleRemove}>{t('Delete question')}</HoldButton>
        </Sheet>
      )}
    </>
  )
}
