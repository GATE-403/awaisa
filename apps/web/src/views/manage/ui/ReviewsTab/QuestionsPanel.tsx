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
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})

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
        title={t('Вопросов пока нет')}
        text={t(
          'Клиенты спрашивают на странице места; ответ появится там же, и придёт в Telegram.',
        )}
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
        title: saved.answer ? t('Ответ опубликован') : t('Ответ убран'),
        type: 'success',
      })
      setEditing(null)
    } catch (answerError) {
      toast.show({
        title: t('Не получилось'),
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
      toast.show({ title: t('Вопрос удалён') })
      setEditing(null)
    } catch (removeError) {
      toast.show({
        title: t('Не получилось'),
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
              {question.authorName} ·{' '}
              {t.language === 'ru'
                ? dateFormatter.format(new Date(question.createdAt))
                : formatMomentDay(question.createdAt, t)}
              {!question.answer && <span className={styles.openMark}> · {t('ждёт ответа')}</span>}
            </p>
            {question.answer && <p className={styles.answerText}>{question.answer}</p>}
            <button
              type='button'
              className={question.answer ? styles.replyEdit : styles.replyButton}
              onClick={() => open(question)}
            >
              {question.answer ? (
                <>
                  <PencilSimple weight='bold' aria-hidden />
                  {t('Изменить')}
                </>
              ) : (
                t('Ответить')
              )}
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <Sheet
          title={t('Ответ на вопрос')}
          onClose={() => setEditing(null)}
          action={{ label: t('Готово'), form: ANSWER_FORM }}
        >
          <form id={ANSWER_FORM} className={styles.form} onSubmit={handleAnswer}>
            <p className={styles.quote}>
              {editing.authorName}: «{editing.text}»
            </p>
            <textarea
              aria-label={t('Ответ')}
              className={styles.textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              rows={5}
            />
            <p className={styles.hint}>
              {t('Вопрос с ответом увидят все на странице места. Пустой ответ снимает его.')}
            </p>
          </form>
          <HoldButton onConfirm={handleRemove}>{t('Удалить вопрос')}</HoldButton>
        </Sheet>
      )}
    </>
  )
}
