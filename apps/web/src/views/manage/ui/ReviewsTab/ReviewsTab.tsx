'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import {
  ArrowBendDoubleUpLeft,
  ChatCircle,
  CheckCircle,
  GearSix,
  PencilSimple,
  Star,
} from '@phosphor-icons/react/ssr'
import { useEffect, useRef, useState } from 'react'
import { ReviewItem } from '@/entities/review'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  getManagedQuestions,
  getManagedReviews,
  getReviewReplySettings,
  replyToQuietReviews,
  replyToReview,
  saveReviewReplySettings,
  setReviewResolved,
} from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type {
  BusinessQuestion,
  ManagedReview,
  ReviewReplySettings,
  ReviewSummary,
} from '@/shared/api/types'
import { pluralize, pluralWord } from '@/shared/lib/plural'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import forms from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { ContactClientSheet } from './ContactClientSheet'
import { PAGE_SIZE, POOR_RATING, REVIEW_WORDS } from './config'
import { QuestionsPanel } from './QuestionsPanel'
import { QuietReplySheet } from './QuietReplySheet'
import { ReplyComposer } from './ReplyComposer'
import { ReplySettingsSheet } from './ReplySettingsSheet'
import styles from './ReviewsTab.module.css'

interface ReviewsTabProps {
  slug: string
  businessName: string
}

type ReviewsView = 'open' | 'all' | 'questions'

// Poor ratings nobody has settled come first in «Без ответа»: they are the ones that cost clients.
// One settled while the tab is open keeps its place until the tab changes (it used to jump away).
const needsPerson = (review: ManagedReview, settledNow: Set<string>) =>
  review.rating <= POOR_RATING && (!review.resolvedAt || settledNow.has(review.id))

// What clients said after their visits, as a Threads-like feed right on the page: no cards,
// fills or glyph rows. Under a review waiting for an answer the reply field is simply there, bare
// like the number on the sign-in screen; a published reply has «Изменить». One row of tabs:
// «Без ответа» (the owner's job here, first when there are any; poor ratings not yet settled lead,
// and sending moves on to the next field), «Все», «Вопросы». Long feeds come ten at a time. Good
// ratings without words can be thanked all at once; poor ones offer «Написать клиенту» and
// «Решено».
export const ReviewsTab = ({ slug, businessName }: ReviewsTabProps) => {
  const toast = useToast()
  const [data, setData] = useState<ReviewSummary<ManagedReview> | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The published reply being changed.
  const [editingId, setEditingId] = useState<string | null>(null)
  // Chosen by the owner; until then «Без ответа» when there are any.
  const [chosenView, setChosenView] = useState<ReviewsView | null>(null)
  // Answered while «Без ответа» is open: they stay in view with their reply until the tab changes.
  const [answeredNow, setAnsweredNow] = useState<Set<string>>(new Set())
  const [settledNow, setSettledNow] = useState<Set<string>>(new Set())
  const [shownCount, setShownCount] = useState(PAGE_SIZE)
  const [questions, setQuestions] = useState<BusinessQuestion[] | null>(null)
  const [replySettings, setReplySettings] = useState<ReviewReplySettings | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isQuietOpen, setIsQuietOpen] = useState(false)
  // The poor review whose author the owner is writing to.
  const [contacting, setContacting] = useState<ManagedReview | null>(null)
  // The automatic reply and quick replies are the owner's to set; staff use the quick replies.
  const isOwner = useCanSeeMoney()
  const toolbarRef = useRef<HTMLDivElement>(null)
  // Pinned under the cabinet bar the toolbar takes its material and a hairline.
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getManagedReviews(slug, controller.signal)
      .then(setData)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })
    getReviewReplySettings(slug, controller.signal)
      .then(setReplySettings)
      .catch(() => undefined)
    getManagedQuestions(slug, controller.signal)
      .then(setQuestions)
      .catch(() => {
        if (!controller.signal.aborted) setQuestions([])
      })

    return () => controller.abort()
  }, [slug])

  // Read on scroll, not by an IntersectionObserver: the cabinet bar sets its height (the sticky
  // top) after mount, so a margin worked out at mount went stale.
  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return
    let frame = 0
    const check = () => {
      frame = 0
      const top = Number.parseFloat(getComputedStyle(toolbar).top) || 0
      setIsStuck(window.scrollY > 0 && toolbar.getBoundingClientRect().top <= top + 1)
    }
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const openQuestions = questions?.filter((question) => !question.answer).length ?? 0
  // The server's count: the cabinet loads the latest reviews and older ones without a reply, not all.
  const unanswered = data?.unanswered ?? data?.items.filter((item) => !item.reply).length ?? 0
  const view: ReviewsView = chosenView ?? (unanswered > 0 ? 'open' : 'all')
  // A stable sort: the server's newest-first order stays within each group, and a review answered
  // here keeps its place.
  const matching =
    view === 'open'
      ? (data?.items.filter((item) => !item.reply || answeredNow.has(item.id)) ?? []).sort(
          (left, right) =>
            Number(needsPerson(right, settledNow)) - Number(needsPerson(left, settledNow)),
        )
      : (data?.items ?? [])
  const quiet = data?.quietUnanswered
  const canReplyToQuiet =
    isOwner && view !== 'questions' && replySettings !== null && (quiet?.fourAndUp ?? 0) > 0
  const shown = matching.slice(0, shownCount)
  // Loaded but not shown yet, then what the server has beyond what was loaded.
  const hiddenCount = matching.length - shown.length
  const serverTotal = view === 'open' ? unanswered : (data?.count ?? 0)

  const chooseView = (next: ReviewsView) => {
    setChosenView(next)
    setAnsweredNow(new Set())
    setSettledNow(new Set())
    setShownCount(PAGE_SIZE)
    setEditingId(null)
  }

  const saveReply = async (review: ManagedReview, text: string) => {
    try {
      const saved = await replyToReview(slug, review.id, text)
      updateItem(review.id, { reply: saved.reply, isAutoReply: false })
      setAnsweredNow((current) => new Set(current).add(review.id))
      setEditingId(null)
      void refreshBusiness(slug)
      toast.show({ title: saved.reply ? 'Ответ опубликован' : 'Ответ удалён', type: 'success' })
    } catch (replyError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(replyError),
        type: 'error',
      })
      throw replyError
    }
  }

  const updateItem = (id: string, patch: Partial<ManagedReview>) =>
    setData(
      (current) =>
        current && {
          ...current,
          items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        },
    )

  const toggleResolved = async (review: ManagedReview) => {
    const isResolved = !review.resolvedAt
    try {
      const saved = await setReviewResolved(slug, review.id, isResolved)
      updateItem(review.id, { resolvedAt: saved.resolvedAt })
      setSettledNow((current) => new Set(current).add(review.id))
      if (isResolved) toast.show({ title: 'Отмечено: решено', type: 'success' })
    } catch (resolveError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(resolveError),
        type: 'error',
      })
    }
  }

  const replyToQuiet = async (input: { minRating: 4 | 5; template: string }) => {
    try {
      const { count } = await replyToQuietReviews(slug, input)
      setData(await getManagedReviews(slug))
      setAnsweredNow(new Set())
      void refreshBusiness(slug)
      toast.show({
        title: count > 0 ? `Ответили на ${pluralize(count, [...REVIEW_WORDS])}` : 'Отвечать некому',
        type: 'success',
      })
    } catch (sendError) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(sendError), type: 'error' })
      throw sendError
    }
  }

  const saveSettings = async (next: ReviewReplySettings) => {
    try {
      setReplySettings(await saveReviewReplySettings(slug, next))
      toast.show({
        title: next.autoReply.isEnabled ? 'Автоответ включён' : 'Сохранено',
        type: 'success',
      })
    } catch (saveError) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(saveError), type: 'error' })
      throw saveError
    }
  }

  return (
    <section className={`${forms.section} ${styles.page}`}>
      {/* One line: the tabs on the left, the rating on the right; no hint line of its own. */}
      <div ref={toolbarRef} className={styles.toolbar} data-stuck={isStuck || undefined}>
        <SectionHeader
          title='Отзывы'
          description={
            <TextTabs
              label='Отзывы и вопросы'
              items={[
                {
                  label: 'Без ответа',
                  count: data ? unanswered - answeredNow.size : undefined,
                  isActive: view === 'open',
                  onSelect: () => chooseView('open'),
                },
                {
                  label: 'Все',
                  count: data?.count,
                  isActive: view === 'all',
                  onSelect: () => chooseView('all'),
                },
                {
                  label: 'Вопросы',
                  count: openQuestions > 0 ? `${openQuestions} без ответа` : questions?.length,
                  isActive: view === 'questions',
                  onSelect: () => chooseView('questions'),
                },
              ]}
            />
          }
          actions={
            <FloatingToolbar align='end'>
              {data && data.count > 0 && (
                <p className={styles.rating}>
                  <Star weight='fill' aria-hidden />
                  <b>{data.average.toFixed(1).replace('.', ',')}</b>
                  {` · ${pluralize(data.count, [...REVIEW_WORDS])}`}
                </p>
              )}
              {isOwner && replySettings && (
                <GlyphGroup label='Отзывы'>
                  {canReplyToQuiet && quiet && (
                    <GlyphButton
                      icon={
                        <>
                          <ArrowBendDoubleUpLeft />
                          <span className={styles.glyphCount} aria-hidden>
                            {quiet.fourAndUp}
                          </span>
                        </>
                      }
                      label={`Ответить всем: ${pluralize(quiet.fourAndUp, ['оценка', 'оценки', 'оценок'])} без текста`}
                      onClick={() => setIsQuietOpen(true)}
                    />
                  )}
                  <GlyphButton
                    icon={<GearSix />}
                    label='Ответы на отзывы'
                    onClick={() => setIsSettingsOpen(true)}
                  />
                </GlyphGroup>
              )}
            </FloatingToolbar>
          }
        />
      </div>
      {view === 'questions' && (
        <QuestionsPanel slug={slug} questions={questions} onChange={setQuestions} />
      )}
      {view !== 'questions' && error && <p className={styles.error}>{error}</p>}
      {view !== 'questions' && !data && !error && <Skeleton className={styles.skeleton} />}
      {view !== 'questions' && data?.count === 0 && (
        <EmptyState
          title='Отзывов пока нет'
          text='Они появятся после первых визитов: клиенты оценивают мастера по ссылке из SMS или в «Моих записях».'
        />
      )}
      {view !== 'questions' && data && data.count > 0 && shown.length === 0 && (
        <EmptyState variant='inline' text='На все отзывы есть ответ' />
      )}
      {view !== 'questions' && shown.length > 0 && (
        <>
          <MoreFade
            hiddenCount={hiddenCount}
            isOpen={false}
            onToggle={() => setShownCount((count) => count + PAGE_SIZE)}
            label={pluralWord(hiddenCount, [...REVIEW_WORDS])}
          >
            <ul className={styles.thread}>
              {shown.map((review) => {
                const isEditing = editingId === review.id
                const firstName = review.authorName.split(' ')[0] ?? review.authorName
                return (
                  <ReviewItem
                    key={review.id}
                    review={isEditing ? { ...review, reply: null } : review}
                    businessName={businessName}
                    meta={`${review.serviceName} · ${review.specialistName}`}
                    actions={
                      review.rating <= POOR_RATING && (
                        <div className={styles.followUp}>
                          <button
                            type='button'
                            className={styles.followUpAction}
                            onClick={() => setContacting(review)}
                          >
                            <ChatCircle aria-hidden />
                            Написать клиенту
                          </button>
                          <button
                            type='button'
                            className={styles.followUpAction}
                            aria-pressed={Boolean(review.resolvedAt)}
                            onClick={() => void toggleResolved(review)}
                          >
                            <CheckCircle
                              weight={review.resolvedAt ? 'fill' : 'regular'}
                              aria-hidden
                            />
                            Решено
                          </button>
                        </div>
                      )
                    }
                    replyAction={
                      review.reply && !isEditing ? (
                        <>
                          {review.isAutoReply && <span className={styles.autoMark}>Автоответ</span>}
                          <button
                            type='button'
                            className={styles.replyEdit}
                            onClick={() => setEditingId(review.id)}
                          >
                            <PencilSimple aria-hidden />
                            Изменить
                          </button>
                        </>
                      ) : (
                        <ReplyComposer
                          key={isEditing ? 'edit' : 'new'}
                          initial={isEditing ? (review.reply ?? '') : ''}
                          placeholder={`Ответить ${firstName}…`}
                          onSave={(text) => saveReply(review, text)}
                          isNextFocused={view === 'open' && !isEditing}
                          onCancel={isEditing ? () => setEditingId(null) : undefined}
                          quickReplies={replySettings?.quickReplies}
                          context={{
                            authorName: review.authorName,
                            specialistName: review.specialistName,
                            serviceName: review.serviceName,
                          }}
                        />
                      )
                    }
                  />
                )
              })}
            </ul>
          </MoreFade>
          {hiddenCount === 0 && serverTotal > matching.length && (
            <p className={styles.more}>
              Показаны последние {matching.length} из {serverTotal}
            </p>
          )}
        </>
      )}
      {isQuietOpen && quiet && replySettings && (
        <QuietReplySheet
          counts={quiet}
          template={replySettings.autoReply.template}
          onSend={replyToQuiet}
          onClose={() => setIsQuietOpen(false)}
        />
      )}
      {contacting && (
        <ContactClientSheet
          slug={slug}
          businessName={businessName}
          review={contacting}
          canOfferCode={isOwner}
          onClose={() => setContacting(null)}
        />
      )}
      {isSettingsOpen && replySettings && (
        <ReplySettingsSheet
          settings={replySettings}
          onSave={saveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </section>
  )
}
