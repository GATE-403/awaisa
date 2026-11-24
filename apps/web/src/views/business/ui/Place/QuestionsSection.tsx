'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import NextLink from 'next/link'
import { useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { askQuestion } from '@/shared/api/clientApi'
import type { Business, QuestionList } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import styles from './Questions.module.css'

interface QuestionsSectionProps {
  business: Business
  questions: QuestionList
}

const FIRST = 3
const ASK_FORM = 'ask-question'

// What people asked before booking and what the place answered: parking, children, cards.
export const QuestionsSection = ({ business, questions }: QuestionsSectionProps) => {
  const toast = useToast()
  const t = useT()
  const session = useSession()
  const [isAll, setIsAll] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const hidden = Math.max(0, questions.items.length - FIRST)
  const isSignedIn = session.status === 'signedIn'

  const handleAsk = async (event: React.FormEvent) => {
    event.preventDefault()
    if (text.trim().length < 3) {
      setError(t('Write your question'))
      return
    }
    setIsSending(true)
    try {
      await askQuestion(business.slug, text.trim())
      toast.show({
        title: t('Question sent'),
        description: t('The answer will appear here once the place replies'),
        type: 'success',
      })
      setText('')
      setIsAsking(false)
    } catch (askError) {
      setError(getErrorMessage(askError))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section id='questions' className={styles.section} aria-labelledby='place-questions'>
      <div className={styles.head}>
        <h2 id='place-questions' className={styles.title}>
          {t('Questions')}
        </h2>
        {questions.count > 0 && <span className={styles.count}>{questions.count}</span>}
        {isSignedIn ? (
          <Button
            variant='secondary'
            size='sm'
            className={styles.ask}
            onClick={() => setIsAsking(true)}
          >
            {t('Ask a question')}
          </Button>
        ) : (
          <ButtonLink
            render={<NextLink href={`/login?next=/${business.slug}%23questions`} />}
            variant='secondary'
            size='sm'
            className={styles.ask}
          >
            {t('Ask a question')}
          </ButtonLink>
        )}
      </div>
      {questions.items.length === 0 ? (
        <EmptyState
          variant='inline'
          text={t('Ask about parking, payment or children: the place will answer here.')}
        />
      ) : (
        <MoreFade
          hiddenCount={hidden}
          isOpen={isAll}
          onToggle={() => setIsAll((value) => !value)}
          label={t.count(hidden, ['question', 'questions']).slice(String(hidden).length + 1)}
        >
          <ul className={styles.list}>
            {questions.items.slice(0, isAll ? undefined : FIRST).map((question) => (
              <li key={question.id} className={styles.item}>
                <p className={styles.question}>{question.text}</p>
                <p className={styles.author}>{question.authorName}</p>
                {question.answer && (
                  <div className={styles.answer}>
                    <BusinessTile
                      name={business.name}
                      logoUrl={business.logoUrl}
                      size='sm'
                      className={styles.tile}
                    />
                    <p className={styles.answerText}>{question.answer}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </MoreFade>
      )}
      {isAsking && (
        <Sheet
          title={t('Question')}
          onClose={() => setIsAsking(false)}
          action={{ label: isSending ? t('Sending…') : t('Send'), form: ASK_FORM }}
        >
          <form id={ASK_FORM} className={styles.form} onSubmit={handleAsk} noValidate>
            <textarea
              aria-label={t('Question for {name}', { name: business.name })}
              className={styles.textarea}
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setError(null)
              }}
              maxLength={500}
              rows={4}
              placeholder={t('Is there parking? Can I pay by card?')}
            />
            {error && (
              <p className={styles.error} role='alert'>
                {error}
              </p>
            )}
            <p className={styles.hint}>
              {t(
                'Your question shows once the place answers: with your name, without your number.',
              )}
            </p>
          </form>
        </Sheet>
      )}
    </section>
  )
}
