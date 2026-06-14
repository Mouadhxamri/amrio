# amrio — Product Requirements Document

## What is amrio?

amrio is an AI workspace for customer support teams. It helps support teams answer tickets faster by surfacing internal knowledge, maintaining shared context across the team, and automating repetitive parts of the support workflow.

The goal is to reduce the time between a customer submitting a ticket and a support agent sending a confident, accurate reply — without requiring agents to hunt through wikis, chat history, or previous tickets on their own.

---

## Problem Statement

Customer support teams face a recurring set of problems:

- **Knowledge is siloed.** Answers to common questions live in different places — documentation, Slack threads, teammate memory — and agents waste time hunting for them.
- **Context doesn't transfer.** When a ticket is reassigned or a new agent picks it up, they start from scratch. Previous replies, related tickets, and resolution history are not surfaced automatically.
- **Repetitive work slows response time.** Many tickets have similar patterns. Without tooling, agents re-draft similar replies from scratch every time.
- **Teams can't learn from past resolutions.** Resolved tickets represent a knowledge base, but nothing connects them to future similar tickets in a useful way.

---

## Target Users

**Primary**: Customer support agents at small-to-medium businesses (SMBs) and growing startups.

**Secondary**: Support team leads and managers who want visibility into response quality, workload, and knowledge gaps.

**Not targeted in v1**: Enterprise support organizations with complex ticketing infrastructure, compliance requirements, or dedicated IT administration.

---

## Core Product Areas

### 1. Ticket Workspace
The primary interface where agents handle incoming tickets. Shows the customer message, agent reply composer, and relevant context pulled from the knowledge base and past tickets — all in one view.

### 2. Knowledge Base
A team-maintained store of answers, SOPs, product notes, and resolved ticket patterns. Content can be created manually or derived from resolved tickets. The AI surfaces relevant knowledge base entries when an agent opens a ticket.

### 3. Shared Context
Persistent context that follows a ticket across agent handoffs. Includes prior messages, internal notes, related tickets, and who has handled it. No agent should need to re-read a full thread to understand where things stand.

### 4. Workflow Automation
Rules and AI-driven triggers that handle routine parts of the support flow — categorizing tickets, suggesting draft replies, escalating based on sentiment or content, or routing to the right agent.

---

## Non-Goals (v1)

- No native ticket ingestion (no direct email/Zendesk/Intercom integration in v1 — that is Step N+)
- No real-time customer chat
- No mobile app
- No enterprise SSO or advanced role/permission systems
- No white-labeling or multi-tenant reseller setup

---

## Success Criteria

- An agent can open amrio, see an active ticket, and find a relevant knowledge base suggestion without leaving the app.
- A team can share context on a ticket so any agent can pick it up without re-reading the full thread.
- Draft reply suggestions reduce the average time-to-first-reply.
- A team lead can see the health and workload of their support queue.
