# Voting App Hackathon — Interactive Ranking & Peer Tallying

This document outlines the requirements and design rationale for the next development steps of the voting app to be built during a hackathon. The focus is on building an intuitive interactive ranking interface and updating candidate peer tallies in real time as users rank candidates.

## Summary

This prototype allows users to build up a **ranked list of candidates** interactively from a pool of **unranked candidates**, with the current list of ranked candidates always displayed in order. As each candidate is ranked, a **peer-based ranking tally** is updated live for all candidates. The user interface reflects ranks, including **ties (equal ranks)**, and skips ranks accordingly. All peer ranking updates are recorded on-chain via a smart contract.

---

## Goals

- Allow users to build up a **ranked list** from unranked candidates interactively.
- Reflect equal ranking (ties) properly in the numbering.
- Update a **peer ranking tally** in real-time as users make adjustments.
- Store peer tallies in a **separate smart contract**, allowing live updates without needing a submission button.
- Establish groundwork for selection calculation algorithm later.

---

## User Interface Behavior

### Initial State

- The user sees:
  - A **list of unranked candidates** at the bottom.
  - An **empty ranked list** at the top.

### Adding Candidates

- When a candidate is selected from the unranked list:
  - It is added to the **bottom of the ranked list**.
  - It appears with the next available rank number, considering any existing ties.

### Reordering Candidates

- Users can **drag and drop** or otherwise move candidates up and down in the ranked list.
- Ranking numbers are updated accordingly, using the following rules:
  - Equal-ranked candidates have the same number (e.g., two candidates may both have rank `2=`).
  - The next distinct rank skips over equal ones (e.g., after two candidates at `2=`, the next is ranked `4`).

### Example

Ranked List:

```text
1  Alice  
2= Bob  
2= Charlie  
4  Dana
```

---

## Peer Ranking System

### Concept

- As users rank candidates, a **pairwise comparison** is inferred between candidates.
- For each pair `(A, B)` where A is ranked above B:
  - A is considered preferred to B.
  - A tally in the smart contract is incremented for A > B.

### Live Tally Updates

- There is **no vote submission button**.
- The act of reordering the ranked list **immediately updates peer tallies** in a smart contract.
- This ensures:
  - Instant feedback.
  - Accurate tallies built incrementally.
  - Alignment with **ranked peer voting** principles.

### Technical Notes

- Peer rankings will be stored in a smart contract as a matrix of comparisons. (I will supply more details.)
- Exact algorithms for final outcome selection (e.g. Ranked Pairs) are **out of scope** for this step, but will be compatible with this tallying approach.

---

## Notes on Ranked Peer Voting

While the final winner selection algorithm is not yet implemented, the core idea is:

> Ranked peer voting uses **pairwise comparisons** between all candidates based on how each voter ranks them, producing a network of preferences rather than relying on a single vote.

Wikipedia and related resources can be consulted for further algorithmic design (e.g., [Condorcet method](https://en.wikipedia.org/wiki/Condorcet_method)).

---
