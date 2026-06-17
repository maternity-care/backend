# Part 4 - Data Requirements

## 4.1 Core Entities & Relationships

Full attribute definitions are maintained in `RTW.xlsx` Sheet 5 / `database-sheet.xlsx`.

### Diagram Placeholder - Entity Relationship Diagram (ERD)

INSERT HERE: Conceptual ERD showing core entities and their relationships.  
Use crow's foot notation. Show cardinality and key foreign keys.  
This is a conceptual ERD for requirement purposes; physical ERD belongs in TDS.  
Tool: draw.io | File: `MaternityCare_ERD.drawio`

| Entity | Purpose (one sentence) | Key Relationships | Full Attributes |
| --- | --- | --- | --- |
| User | Represents any account that can authenticate or be referenced by system workflows. | User -- UserProfile; User --< PregnancyProfile; User --< Appointment; User --< Order; User --< ChatConversation; User --< Article; User --< ForumPost | RTW.xlsx Sheet 5 |
| Role | Represents a group of permissions assigned to users. | User >--< Role; Role >--< Permission | RTW.xlsx Sheet 5 |
| Permission | Represents a system-level authorization capability. | Role >--< Permission | RTW.xlsx Sheet 5 |
| UserPermission | Represents a per-user permission override. | User --< UserPermission; Permission --< UserPermission | RTW.xlsx Sheet 5 |
| UserProfile | Represents extended personal information for a user. | User -- UserProfile | RTW.xlsx Sheet 5 |
| Doctor | Represents a user's medical professional profile. | User -- Doctor; Doctor >--< Facility; Doctor --< DoctorShift; Doctor --< Appointment; Doctor --< MedicalRecord | RTW.xlsx Sheet 5 |
| StaffProfile | Represents a user's operational staff profile. | User -- StaffProfile; StaffProfile >--< Facility | RTW.xlsx Sheet 5 |
| Facility | Represents a clinic branch or examination facility. | Facility --< Room; Facility >--< Doctor; Facility >--< StaffProfile; Facility --< FacilityService; Facility --< Appointment | RTW.xlsx Sheet 5 |
| Room | Represents a room inside a facility. | Facility --< Room; Room --< Appointment; Room --< DoctorShift | RTW.xlsx Sheet 5 |
| DoctorShift | Represents a doctor's working slot at a facility. | Doctor --< DoctorShift; Facility --< DoctorShift; Room --< DoctorShift | RTW.xlsx Sheet 5 |
| Service | Represents a standardized medical service offered by the system. | Service --< FacilityService; Service --< PackageService; Service --< Appointment | RTW.xlsx Sheet 5 |
| FacilityService | Represents price, duration, and availability of a service at a facility. | Facility --< FacilityService; Service --< FacilityService | RTW.xlsx Sheet 5 |
| MaternityPackage | Represents a maternity care package sold to patients. | MaternityPackage --< PackageService; MaternityPackage --< PatientPackage | RTW.xlsx Sheet 5 |
| PackageService | Represents services and usage limits included in a package. | MaternityPackage --< PackageService; Service --< PackageService; PackageService --< PackageServiceFacility | RTW.xlsx Sheet 5 |
| PackageServiceFacility | Represents facilities where a package service is applicable. | PackageService --< PackageServiceFacility; Facility --< PackageServiceFacility | RTW.xlsx Sheet 5 |
| PatientPackage | Represents a package purchased by a patient. | User --< PatientPackage; PregnancyProfile --< PatientPackage; MaternityPackage --< PatientPackage; PatientPackage --< PatientPackageBenefit; PatientPackage --< PatientExtraService | RTW.xlsx Sheet 5 |
| PatientPackageBenefit | Represents remaining service entitlement in a purchased package. | PatientPackage --< PatientPackageBenefit; Service --< PatientPackageBenefit | RTW.xlsx Sheet 5 |
| PatientExtraService | Represents an additional paid service outside package entitlement. | User --< PatientExtraService; PatientPackage --< PatientExtraService; Service --< PatientExtraService; Facility --< PatientExtraService | RTW.xlsx Sheet 5 |
| PregnancyProfile | Represents a patient's pregnancy record. | User --< PregnancyProfile; PregnancyProfile --< PregnancyHistoryEvent; PregnancyProfile --< HealthMetric; PregnancyProfile --< Appointment; PregnancyProfile --< MedicalRecord | RTW.xlsx Sheet 5 |
| PregnancyHistoryEvent | Represents timeline events for a pregnancy profile. | PregnancyProfile --< PregnancyHistoryEvent; User --< PregnancyHistoryEvent | RTW.xlsx Sheet 5 |
| HealthMetric | Represents health measurements recorded for a pregnancy profile. | PregnancyProfile --< HealthMetric; User --< HealthMetric | RTW.xlsx Sheet 5 |
| Appointment | Represents a booked medical visit. | User --< Appointment; PregnancyProfile --< Appointment; Facility --< Appointment; Room --< Appointment; Doctor --< Appointment; Service --< Appointment; Appointment --< AppointmentStatusLog; Appointment --< AppointmentReminder; Appointment -- MedicalRecord | RTW.xlsx Sheet 5 |
| AppointmentStatusLog | Represents audit history for appointment status changes. | Appointment --< AppointmentStatusLog; User --< AppointmentStatusLog | RTW.xlsx Sheet 5 |
| AppointmentReminder | Represents scheduled reminder jobs for an appointment. | Appointment --< AppointmentReminder | RTW.xlsx Sheet 5 |
| Order | Represents a billable transaction for packages, appointments, extra services, or products. | User --< Order; Facility --< Order; Order --< OrderItem; Order --< Payment; Order -- Invoice; Order --< Refund; Order -- ProductOrder | RTW.xlsx Sheet 5 |
| OrderItem | Represents a line item inside an order. | Order --< OrderItem | RTW.xlsx Sheet 5 |
| Payment | Represents a payment attempt or successful payment for an order. | Order --< Payment; Payment --< Refund | RTW.xlsx Sheet 5 |
| Invoice | Represents an invoice issued for a paid order. | Order -- Invoice | RTW.xlsx Sheet 5 |
| Refund | Represents a refund request and its processing state. | Order --< Refund; Payment --< Refund; User --< Refund | RTW.xlsx Sheet 5 |
| ProductCategory | Represents a product classification. | ProductCategory --< ProductCategory; ProductCategory --< Product | RTW.xlsx Sheet 5 |
| Product | Represents a sellable product. | ProductCategory --< Product; Product --< CartItem | RTW.xlsx Sheet 5 |
| Cart | Represents a user's active shopping cart. | User -- Cart; Cart --< CartItem | RTW.xlsx Sheet 5 |
| CartItem | Represents a product selected in a cart. | Cart --< CartItem; Product --< CartItem | RTW.xlsx Sheet 5 |
| ProductOrder | Represents shipping information for a product order. | Order -- ProductOrder | RTW.xlsx Sheet 5 |
| MedicalRecord | Represents doctor's conclusion after an appointment. | Appointment -- MedicalRecord; PregnancyProfile --< MedicalRecord; Doctor --< MedicalRecord; MedicalRecord --< MedicalFile; MedicalRecord --< Prescription | RTW.xlsx Sheet 5 |
| MedicalFile | Represents uploaded medical result files. | MedicalRecord --< MedicalFile; Appointment --< MedicalFile; User --< MedicalFile | RTW.xlsx Sheet 5 |
| Prescription | Represents an electronic prescription. | MedicalRecord --< Prescription; User --< Prescription; Doctor --< Prescription; Prescription --< PrescriptionItem; Prescription --< PrescriptionHistory | RTW.xlsx Sheet 5 |
| PrescriptionItem | Represents one medicine instruction inside a prescription. | Prescription --< PrescriptionItem; PrescriptionItem --< MedicationTakenLog | RTW.xlsx Sheet 5 |
| PrescriptionHistory | Represents auditable prescription changes. | Prescription --< PrescriptionHistory; User --< PrescriptionHistory | RTW.xlsx Sheet 5 |
| MedicationTakenLog | Represents patient confirmation that medicine was taken. | PrescriptionItem --< MedicationTakenLog; User --< MedicationTakenLog | RTW.xlsx Sheet 5 |
| ChatConversation | Represents a chat thread between patient and doctor/staff/chatbot. | User --< ChatConversation; Facility --< ChatConversation; ChatConversation --< ChatMessage | RTW.xlsx Sheet 5 |
| ChatMessage | Represents a message or file sent in a chat conversation. | ChatConversation --< ChatMessage; User --< ChatMessage | RTW.xlsx Sheet 5 |
| Article | Represents maternity knowledge content. | User --< Article | RTW.xlsx Sheet 5 |
| FAQ | Represents frequently asked questions. | FAQ has no mandatory parent entity | RTW.xlsx Sheet 5 |
| ForumPost | Represents a community post. | User --< ForumPost; ForumPost --< ForumComment | RTW.xlsx Sheet 5 |
| ForumComment | Represents a comment or reply in a forum post. | ForumPost --< ForumComment; User --< ForumComment; ForumComment --< ForumComment | RTW.xlsx Sheet 5 |
| ContentReport | Represents a moderation report for user-generated or published content. | User --< ContentReport | RTW.xlsx Sheet 5 |
| Setting | Represents system configuration key-value data. | Setting has no mandatory parent entity | RTW.xlsx Sheet 5 |

## 4.2 Data Constraints & Integrity Rules

| ID | Constraint | Entities Affected | Violation Behaviour |
| --- | --- | --- | --- |
| DC-01 | Email must be unique across all user accounts. | User | Reject registration/update with HTTP 409 and duplicate email message. |
| DC-02 | A user cannot reference a non-existent role, and a role cannot reference a non-existent permission. | User, Role, Permission | Reject assignment with HTTP 400/404; no partial mapping is created. |
| DC-03 | A user permission override must reference an existing user and permission, and only one override may exist for a user-permission pair. | UserPermission, User, Permission | Reject invalid override with HTTP 404 or duplicate override with HTTP 409. |
| DC-04 | Doctor and staff profiles must reference an existing user and must be unique per user. | Doctor, StaffProfile, User | Reject duplicate profile creation with HTTP 409. |
| DC-05 | A room must belong to an existing facility. | Room, Facility | Reject room creation/update with HTTP 404 for invalid facility. |
| DC-06 | A facility-service pair must be unique. | FacilityService, Facility, Service | Reject duplicate configuration with HTTP 409. |
| DC-07 | A package-service pair must be unique. | PackageService, MaternityPackage, Service | Reject duplicate package benefit configuration with HTTP 409. |
| DC-08 | Patient package benefits cannot have `used_quantity` greater than `total_quantity` or negative remaining quantity. | PatientPackageBenefit | Reject consumption transaction with HTTP 422; appointment/package usage is not updated. |
| DC-09 | Appointment must reference available facility service and a valid doctor shift when doctor is selected. | Appointment, FacilityService, DoctorShift | Reject booking with HTTP 422 and reason such as unavailable service or unavailable slot. |
| DC-10 | Appointment status changes must follow the transition table in section 4.4. | Appointment, AppointmentStatusLog | Reject invalid transition with HTTP 409; no status log is written. |
| DC-11 | Appointment check-in time cannot be set when appointment is cancelled or no-show. | Appointment | Reject update with HTTP 409. |
| DC-12 | Order total must equal item subtotal minus discount and must not be negative. | Order, OrderItem | Reject order creation/update with HTTP 422. |
| DC-13 | Payment amount cannot exceed unpaid order balance unless order type supports overpayment handling. | Payment, Order | Reject payment update with HTTP 422. |
| DC-14 | Paid order financial snapshot fields are immutable except refund-related status fields. | Order, OrderItem, Payment, Invoice | Reject mutation with HTTP 409; user must create adjustment/refund flow. |
| DC-15 | Invoice can be issued only once per order. | Invoice, Order | Reject duplicate invoice creation with HTTP 409. |
| DC-16 | Refund amount cannot exceed refundable paid amount. | Refund, Order, Payment | Reject refund request with HTTP 422. |
| DC-17 | Cart cannot contain duplicate product rows for the same product. | Cart, CartItem, Product | Merge quantity or reject duplicate row with HTTP 409, depending API contract. |
| DC-18 | Medical record can be created only for an existing appointment and one appointment can have at most one primary medical record. | MedicalRecord, Appointment | Reject duplicate or orphan medical record with HTTP 409/404. |
| DC-19 | Prescription items must belong to an existing prescription; prescription history snapshots are append-only. | Prescription, PrescriptionItem, PrescriptionHistory | Reject orphan item with HTTP 404; reject history modification with HTTP 409. |
| DC-20 | Medical files must reference an existing appointment and medical record when linked after examination. | MedicalFile, Appointment, MedicalRecord | Reject upload linking with HTTP 404/422. |
| DC-21 | Chat messages cannot be added to closed conversations unless the conversation is reopened through a valid transition. | ChatConversation, ChatMessage | Reject send with HTTP 409. |
| DC-22 | Published content slugs must be unique. | Article, Product, ProductCategory | Reject duplicate slug with HTTP 409. |
| DC-23 | Forum comments must reference an existing post, and nested comments must reference comments from the same post. | ForumPost, ForumComment | Reject comment creation with HTTP 422. |
| DC-24 | State transition logs and audit histories are append-only. | AppointmentStatusLog, PrescriptionHistory, PregnancyHistoryEvent | Reject update/delete through normal APIs with HTTP 403/409. |

## 4.3 Data Retention & Ownership Policy

| Data Type | Retention Period | Owner | Deletion Authority | Basis |
| --- | --- | --- | --- | --- |
| Account and authentication data | Until account deletion request is approved or legal/accounting obligations require retention | User / System | System admin can deactivate; hard delete only by approved privacy process | Account security and privacy policy |
| RBAC configuration | Until replaced or system decommissioned | System | System admin only | Access control policy |
| User permission overrides | Until override is removed or user account is deleted | System | System admin or authorized account manager | Access control exception policy |
| Facility, room, staff assignment data | Until facility/staff record is archived; historical links retained while referenced by appointments/orders | System | System admin or facility admin can deactivate; hard delete only if unreferenced | Operational audit policy |
| Doctor professional profile | Until doctor account is deactivated; historical references retained for medical records | System / Doctor | System admin can deactivate; hard delete only if legally allowed and unreferenced | Medical accountability policy |
| Pregnancy profile and health metrics | Medical retention policy / until legal expiry | Patient | Patient may request export; deletion requires privacy/legal approval and may be denied for medical/legal retention | Medical record retention policy |
| Appointment and appointment status logs | Until appointment archive policy expires; logs retained with appointment | Patient / System | Facility admin may cancel/archive; audit logs cannot be user-deleted | Care continuity and audit policy |
| Package entitlement and extra service usage | Until package expires plus financial/audit retention period | Patient / System | System/facility admin can cancel through valid workflow; hard delete not allowed when financially referenced | Contract and payment audit policy |
| Orders, payments, invoices, refunds | Accounting retention policy | System / Customer | Finance/system admin can void/refund through workflow; hard delete prohibited during retention period | Accounting and tax policy |
| Product catalog | Until product is discontinued and no active orders depend on it | Shop | Shop/admin can deactivate; hard delete only if unreferenced | Commerce operation policy |
| Cart data | Until checkout, cart cleared, or inactivity purge threshold | User | User can clear cart; system can purge abandoned carts | User convenience and storage policy |
| Medical records, medical files, prescriptions | Medical retention policy / until legal expiry | Patient / Care provider | Doctor can amend through controlled workflow; hard delete requires legal/privacy approval | Medical record retention policy |
| Medication taken logs | Until related prescription retention expires or approved privacy deletion | Patient | Patient can add logs; deletion follows health-data policy | Patient health tracking policy |
| Chat conversation and messages | Until conversation archive/delete policy; medical advice chats may follow medical retention | Patient / System | User may request deletion; staff/admin may close/archive; legal hold overrides deletion | Support and medical advice policy |
| Articles and FAQ | Until unpublished/archived and content retention period expires | System | Content admin/moderator | Content governance policy |
| Forum posts, comments, reports | Until user deletes content or moderator removes content; reports retained for moderation audit | User / System | Author can delete own visible content where allowed; moderator can hide/remove; reports retained | Community moderation policy |
| Settings | Until changed or system decommissioned | System | System admin only | Configuration management policy |
| Audit histories and transition logs | Immutable for the lifetime of the referenced record and audit retention period | System | No normal delete authority; purge only by approved retention job | Audit integrity policy |

## 4.4 State Transition Tables

### 4.4.1 Appointment State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| draft | Patient submits booking requiring payment | Service available and slot held | pending_payment | Create appointment draft and related order. |
| draft | Staff confirms unpaid/internal booking | Service available and slot held | booked | Create appointment and write status log. |
| pending_payment | Payment succeeds | Order is paid | booked | Mark appointment booked and write status log. |
| booked | Staff/doctor confirms appointment | Appointment not cancelled and slot still valid | confirmed | Write status log and schedule reminder. |
| booked | Patient requests reschedule | New slot available and reschedule policy allows | rescheduled | Release old slot, reserve new slot, write status log. |
| confirmed | Patient requests reschedule | New slot available and reschedule policy allows | rescheduled | Release old slot, reserve new slot, write status log. |
| rescheduled | Staff confirms new slot | New slot remains available | confirmed | Confirm appointment and update reminder schedule. |
| confirmed | Patient arrives | Appointment date/time is check-in eligible | checked_in | Set `checked_in_at` and write status log. |
| checked_in | Doctor starts examination | Doctor assigned and appointment not cancelled | in_progress | Mark visit in progress. |
| in_progress | Doctor completes examination | Required medical record data entered | completed | Finalize appointment; consume package benefit if applicable. |
| booked | Patient/staff cancels | Cancellation policy allows | cancelled | Release slot and trigger refund/reversal if applicable. |
| confirmed | Patient/staff cancels | Cancellation policy allows | cancelled | Release slot and trigger refund/reversal if applicable. |
| booked | No-show job runs | Appointment time passed and no check-in | no_show | Mark no-show and write status log. |
| confirmed | No-show job runs | Appointment time passed and no check-in | no_show | Mark no-show and write status log. |

Invalid Transitions (must be rejected - DC-09):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| pending_payment | checked_in | Payment must complete before visit. | HTTP 409 + error message. |
| booked | in_progress | Must be checked in before examination starts. | HTTP 409 + error message. |
| confirmed | completed | Cannot skip check-in and in-progress states. | HTTP 409 + error message. |
| cancelled | checked_in | Cancelled is terminal. | HTTP 409 + error message. |
| cancelled | completed | Cancelled is terminal. | HTTP 409 + error message. |
| completed | cancelled | Completed visit cannot be cancelled; use refund/adjustment workflow if needed. | HTTP 409 + error message. |
| no_show | checked_in | No-show is terminal unless admin reversal workflow exists. | HTTP 409 + error message. |

Diagram Placeholder - Appointment State Machine Diagram

INSERT HERE: State Machine / State Diagram for Appointment lifecycle.  
Label each transition arrow with the trigger event.  
Show terminal states (`completed`, `cancelled`, `no_show`) clearly.  
Tool: draw.io | File: `MaternityCare_AppointmentStateMachine.drawio`

### 4.4.2 Order State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| draft | Customer confirms checkout | At least one valid order item exists | pending_payment | Calculate total and create payment request. |
| pending_payment | Payment succeeds | Paid amount equals required amount | paid | Lock order snapshot and trigger fulfillment. |
| pending_payment | Customer cancels before payment | No successful payment exists | cancelled | Cancel order and release reserved resources. |
| paid | Refund approved for full amount | Refund amount equals paid refundable amount | refunded | Create refund record and update order status. |
| paid | Refund approved for partial amount | Refund amount less than paid refundable amount | partially_refunded | Create refund record and keep order partially settled. |
| partially_refunded | Additional refund approved | Remaining refundable amount is positive | refunded | Update refund totals and close financial balance if fully refunded. |

Invalid Transitions (must be rejected - DC-13):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| paid | draft | Paid financial snapshot is immutable. | HTTP 409 + error message. |
| paid | pending_payment | Cannot move a paid order back to payment pending. | HTTP 409 + error message. |
| cancelled | paid | Cancelled order cannot be paid; create a new order. | HTTP 409 + error message. |
| refunded | paid | Fully refunded order is terminal. | HTTP 409 + error message. |
| refunded | partially_refunded | Fully refunded order cannot become partially refunded. | HTTP 409 + error message. |

Diagram Placeholder - Order State Machine Diagram

INSERT HERE: State Machine / State Diagram for Order lifecycle.  
Tool: draw.io | File: `MaternityCare_OrderStateMachine.drawio`

### 4.4.3 Payment State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| pending | Provider confirms success | Provider transaction is valid and amount matches | success | Mark payment paid and update order balance/status. |
| pending | Provider confirms failure | Provider response is valid | failed | Store failure response and keep order pending if retry allowed. |
| pending | Customer/admin cancels attempt | Provider allows cancellation and no success callback received | cancelled | Mark attempt cancelled. |

Invalid Transitions (must be rejected - DC-12):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| success | failed | Successful payment is terminal. | HTTP 409 + error message. |
| success | cancelled | Successful payment cannot be cancelled; use refund. | HTTP 409 + error message. |
| failed | success | Failed payment attempt is terminal; create a new attempt. | HTTP 409 + error message. |
| cancelled | success | Cancelled payment attempt is terminal unless provider reconciliation workflow exists. | HTTP 409 + error message. |

Diagram Placeholder - Payment State Machine Diagram

INSERT HERE: State Machine / State Diagram for Payment lifecycle.  
Tool: draw.io | File: `MaternityCare_PaymentStateMachine.drawio`

### 4.4.4 Patient Package State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| pending_payment | Package order paid | Order status is paid | active | Create package benefits from package configuration. |
| active | Expiry job runs | End date passed or benefit period expired | expired | Disable further package benefit consumption. |
| active | Patient upgrades package | Upgrade order is paid | upgraded | Link new package via `upgraded_from_id` and close old package. |
| pending_payment | Customer cancels before payment | No successful payment exists | cancelled | Cancel package registration. |
| active | Admin cancels package | Cancellation policy allows | cancelled | Disable benefits and trigger refund workflow if applicable. |

Invalid Transitions (must be rejected - DC-07):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| pending_payment | expired | Package never became active. | HTTP 409 + error message. |
| expired | active | Expired package cannot be reactivated; create renewal/upgrade flow. | HTTP 409 + error message. |
| upgraded | active | Upgraded package is closed. | HTTP 409 + error message. |
| cancelled | active | Cancelled package cannot be activated without a new paid order. | HTTP 409 + error message. |

Diagram Placeholder - Patient Package State Machine Diagram

INSERT HERE: State Machine / State Diagram for PatientPackage lifecycle.  
Tool: draw.io | File: `MaternityCare_PatientPackageStateMachine.drawio`

### 4.4.5 Patient Extra Service State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| pending_payment | Extra service payment succeeds | Order is paid | paid | Mark service available for booking/use. |
| pending_payment | Customer cancels before payment | No successful payment exists | cancelled | Cancel extra service item. |
| paid | Appointment using service is completed | Appointment completed and service not previously used | used | Mark extra service consumed. |
| paid | Customer cancels unused service | Service not used and cancellation policy allows | cancelled | Cancel service and trigger refund if applicable. |

Invalid Transitions (must be rejected - DC-07):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| pending_payment | used | Service must be paid before use. | HTTP 409 + error message. |
| used | cancelled | Used service cannot be cancelled. | HTTP 409 + error message. |
| cancelled | paid | Cancelled service cannot be paid; create a new service order. | HTTP 409 + error message. |

Diagram Placeholder - Patient Extra Service State Machine Diagram

INSERT HERE: State Machine / State Diagram for PatientExtraService lifecycle.  
Tool: draw.io | File: `MaternityCare_PatientExtraServiceStateMachine.drawio`

### 4.4.6 Refund State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| requested | Finance/admin approves | Refund amount is refundable | approved | Store approver and await processing. |
| requested | Finance/admin rejects | Rejection reason provided | rejected | Store rejection reason and notify requester. |
| approved | Payment provider confirms refund | Provider transaction succeeds | processed | Update order refund status. |
| approved | Payment provider fails refund | Provider response indicates failure | failed | Store failure response and allow retry/review. |
| failed | Finance retries refund | Refund still valid | approved | Requeue provider refund attempt. |

Invalid Transitions (must be rejected - DC-15):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| requested | processed | Must be approved before processing. | HTTP 409 + error message. |
| rejected | processed | Rejected refund is terminal. | HTTP 409 + error message. |
| processed | rejected | Processed refund is terminal. | HTTP 409 + error message. |
| processed | failed | Processed refund is terminal. | HTTP 409 + error message. |

Diagram Placeholder - Refund State Machine Diagram

INSERT HERE: State Machine / State Diagram for Refund lifecycle.  
Tool: draw.io | File: `MaternityCare_RefundStateMachine.drawio`

### 4.4.7 Prescription State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| draft | Doctor publishes prescription | At least one prescription item exists | active | Write prescription history snapshot. |
| draft | Doctor cancels draft | Doctor owns medical record | cancelled | Mark prescription cancelled and write history. |
| active | Doctor cancels prescription | Cancellation reason provided | cancelled | Mark prescription cancelled and write history. |
| active | Patient completes medication course | All required medicines marked complete or doctor closes | completed | Mark prescription completed. |

Invalid Transitions (must be rejected - DC-19):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| draft | completed | Prescription must become active before completion. | HTTP 409 + error message. |
| cancelled | active | Cancelled prescription cannot be reactivated; create a new prescription. | HTTP 409 + error message. |
| completed | active | Completed prescription is terminal. | HTTP 409 + error message. |
| completed | cancelled | Completed prescription should not be cancelled; create amendment note if needed. | HTTP 409 + error message. |

Diagram Placeholder - Prescription State Machine Diagram

INSERT HERE: State Machine / State Diagram for Prescription lifecycle.  
Tool: draw.io | File: `MaternityCare_PrescriptionStateMachine.drawio`

### 4.4.8 Chat Conversation State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| open | Staff/doctor marks waiting | Conversation requires follow-up | pending | Set status pending and keep assignment. |
| pending | Staff/doctor replies | Conversation assigned or routed | open | Mark active and append message. |
| open | Staff/doctor closes conversation | No unresolved issue remains | closed | Close conversation and prevent normal messages. |
| pending | Staff/doctor closes conversation | Follow-up completed or no response required | closed | Close conversation. |
| closed | Staff/doctor reopens | Reopen reason provided | open | Reopen conversation and allow messages. |

Invalid Transitions (must be rejected - DC-21):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| closed | add message | Closed conversations cannot receive messages without reopen. | HTTP 409 + error message. |
| open | open | No-op state transition. | HTTP 400 + error message. |
| pending | pending | No-op state transition. | HTTP 400 + error message. |

Diagram Placeholder - Chat Conversation State Machine Diagram

INSERT HERE: State Machine / State Diagram for ChatConversation lifecycle.  
Tool: draw.io | File: `MaternityCare_ChatConversationStateMachine.drawio`

### 4.4.9 Article State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| draft | Author submits for review | Required content fields are present | pending_review | Lock review version and notify moderator. |
| pending_review | Moderator approves | Slug is unique and content passes review | published | Set approver and published timestamp. |
| pending_review | Moderator rejects | Rejection reason provided | rejected | Store rejection reason and notify author. |
| rejected | Author revises | Content changed | draft | Return to editable draft. |
| published | Moderator archives | Archive reason provided | archived | Remove from public listing. |
| archived | Moderator republishes | Content still valid and slug unique | published | Restore public listing. |

Invalid Transitions (must be rejected - DC-22):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| draft | published | Must pass review before publishing. | HTTP 409 + error message. |
| rejected | published | Must be revised and resubmitted first. | HTTP 409 + error message. |
| archived | pending_review | Archived content must be restored or revised through defined workflow. | HTTP 409 + error message. |

Diagram Placeholder - Article State Machine Diagram

INSERT HERE: State Machine / State Diagram for Article lifecycle.  
Tool: draw.io | File: `MaternityCare_ArticleStateMachine.drawio`

### 4.4.10 Product Order Shipping State Transition Table

Valid State Transitions:

| From State | Trigger Event | Guard Condition | To State | System Action |
| --- | --- | --- | --- | --- |
| pending | Order paid | Product order is paid and shipping information is valid | packing | Notify warehouse/staff to prepare shipment. |
| packing | Staff hands to carrier | Required shipping info present | shipping | Update shipping status and store carrier info if available. |
| shipping | Delivery confirmed | Carrier/customer confirmation received | delivered | Mark order fulfilled. |
| pending | Customer/admin cancels | Order not shipped | cancelled | Cancel shipment preparation and trigger refund if paid. |
| packing | Customer/admin cancels | Order not handed to carrier and policy allows | cancelled | Cancel shipment preparation and trigger refund if paid. |

Invalid Transitions (must be rejected):

| From State | Attempted Transition | Why Invalid | System Response |
| --- | --- | --- | --- |
| pending | delivered | Cannot skip packing and shipping. | HTTP 409 + error message. |
| packing | delivered | Cannot skip shipping confirmation. | HTTP 409 + error message. |
| shipping | cancelled | Shipped order cannot be cancelled directly; use return/refund workflow. | HTTP 409 + error message. |
| delivered | cancelled | Delivered order is terminal for shipping lifecycle. | HTTP 409 + error message. |
| cancelled | shipping | Cancelled order is terminal. | HTTP 409 + error message. |

Diagram Placeholder - Product Order Shipping State Machine Diagram

INSERT HERE: State Machine / State Diagram for ProductOrder shipping lifecycle.  
Tool: draw.io | File: `MaternityCare_ProductOrderStateMachine.drawio`

### QA Guidance Note

QA should cover:

- Boundary transitions around terminal states: `completed`, `cancelled`, `no_show`, `refunded`, `processed`, `delivered`.
- Duplicate callbacks from payment providers and refund providers.
- Concurrent appointment booking for the same doctor shift and room slot.
- Concurrent package benefit consumption from multiple appointments.
- Reschedule and cancellation flows after payment, including refund side effects.
- Audit immutability for status logs, prescription histories, and pregnancy timeline events.
- Role-based authorization for every state transition, especially finance, doctor, staff, moderator, and system job transitions.
