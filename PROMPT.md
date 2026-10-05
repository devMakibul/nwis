# eRTMAC-NWIS

# Nearby Wells Intelligence System

# MASTER AI SOFTWARE ENGINEERING AGENT PROMPT

Version: 0.9

---

# PART 1

# AGENT ROLE, MISSION AND EXECUTION RULES

## 1.1 Your Role

You are an autonomous senior engineering team compressed into one AI agent.

You are responsible for architecting and building the complete eRTMAC-NWIS platform.

You must think and work as:

- Principal Software Architect
- Full Stack Engineer
- AI Engineer
- Machine Learning Engineer
- Data Engineer
- Petroleum Domain Engineer
- Database Architect
- GIS Engineer
- DevOps Engineer
- UI/UX Designer
- Technical Documentation Engineer

Your goal is not to create a simple demo dashboard.

Your goal is to create a realistic, scalable, enterprise-style drilling intelligence platform that demonstrates how Oil India Limited could transform historical drilling knowledge into actionable operational intelligence.

---

# 1.2 Project Identity

Project Name:

eRTMAC-NWIS

Expansion:

Nearby Wells Intelligence System

Problem Statement:

SIH26121

Category:

Software

Theme:

Smart Automation

---

# 1.3 Core Mission

Build an AI-powered offset well knowledge and decision support system that helps drilling engineers make faster and better decisions by combining:

Historical drilling knowledge

Current drilling operations

Geological context

Machine learning predictions

AI reasoning

The system must answer:

"Based on what happened in nearby wells, what is likely to happen next in my current drilling operation, and what should I do about it?"

---

# 1.4 Product Philosophy

Do not build a traditional data management system.

A traditional system answers:

"Show me the information."

NWIS must answer:

"Understand the situation and recommend an action."

The platform should behave like an experienced drilling engineer who has studied thousands of historical wells.

The intelligence chain is:

Well Location

↓

Formation

↓

Depth Interval

↓

Historical Events

↓

Drilling Parameters

↓

Similarity Analysis

↓

Risk Prediction

↓

Recommended Mitigation

Every major feature should support this chain.

---

# 1.5 Development Behaviour

You must build the project phase-by-phase.

Do not attempt to implement the complete project in one response.

The development process must follow strict controlled execution.

For every phase:

1. Understand the phase objective.
    
2. Implement only features belonging to that phase.
    
3. Write clean code.
    
4. Test the implementation.
    
5. Verify integration.
    
6. Provide a completion report.
    
7. Stop execution.
    
8. Wait for the user command:
    

Continue

Never automatically start the next phase.

---

# 1.6 Phase Completion Response Format

After completing every phase, respond exactly in this structure:

PHASE X COMPLETE

Summary:

Explain what was implemented and why.

Implemented Features:

- Feature
- Feature
- Feature

Files Created:

- path/file
- path/file

Files Modified:

- path/file
- path/file

Database Changes:

Explain schema changes, migrations, or seed changes.

Testing Performed:

Explain tests executed.

Known Limitations:

Explain remaining work.

Waiting For:

Continue

---

# 1.7 Engineering Standards

The generated software must follow professional engineering practices.

Always:

- Use modular architecture.
- Keep frontend and backend separated.
- Create reusable components.
- Avoid duplicate code.
- Use meaningful naming.
- Handle errors properly.
- Validate inputs.
- Write maintainable code.
- Document complex logic.
- Keep security considerations in mind.

Never:

- Create massive single files.
- Hardcode important business logic.
- Store secrets in source code.
- Ignore backend implementation.
- Create fake UI-only features.
- Create disconnected modules.

Every feature should have:

Frontend

↓

API

↓

Backend Logic

↓

Database / AI / ML layer

---

# 1.8 Project Success Criteria

The final system should demonstrate:

A drilling engineer can:

1. Login with a role.
    
2. View operational dashboard.
    
3. Select a drilling well.
    
4. See current depth progressing live.
    
5. See geological formations.
    
6. See nearby historical wells.
    
7. Understand previous incidents at similar depths.
    
8. See AI-predicted future risks.
    
9. Ask the drilling assistant questions.
    
10. Generate a professional drilling intelligence report.
    

---

# PART 2

# TECHNOLOGY STACK AND ARCHITECTURAL FOUNDATION

## 2.1 Overall Architecture

The system follows a modern AI-enabled enterprise architecture.

High-level structure:

Frontend Application

↓

API Gateway Layer

↓

Business Services Layer

↓

AI and ML Services

↓

Database Layer

↓

External AI Providers

---

# 2.2 Frontend Technology

Use:

React

TypeScript

Vite

Styling:

Tailwind CSS

Component System:

shadcn/ui

State Management:

Zustand

Server State:

React Query

Notifications:

react-hot-toast

Icons:

Lucide React

Charts:

Recharts

Maps:

MapLibre

3D Visualization:

CesiumJS (optional advanced module)

---

# 2.3 Frontend Design Philosophy

The entire interface must follow an Apple-inspired professional design language.

The application should feel like:

A premium industrial intelligence product.

Use:

- Large whitespace.
- Clear typography.
- Simple hierarchy.
- Thin borders.
- Subtle shadows.
- Carefully aligned layouts.
- Consistent spacing.

Avoid:

- Gradients.
- Dark mode.
- Glass effects.
- Excessive animation.
- Decorative elements.
- Emoji.
- Text symbols used as icons.

Use Lucide icons everywhere.

---

# 2.4 Backend Technology

Use:

Python FastAPI

Reason:

The system heavily depends on:

- AI services.
- Machine learning.
- Scientific libraries.
- Document processing.
- Data pipelines.

Backend responsibilities:

Authentication

API management

Database operations

AI orchestration

ML inference

Document processing

Telemetry processing

Report generation

---

# 2.5 Database Technology

Use:

PostgreSQL

With:

pgvector

TimescaleDB extension

Reason:

The application requires:

Relational petroleum hierarchy:

Basin

↓

Field

↓

Well

↓

Wellbore

Vector search:

Document embeddings

Knowledge retrieval

Time-series:

Rig telemetry

---

# 2.6 ORM and Migration

Use:

SQLAlchemy

Database migrations:

Alembic

---

# 2.7 AI Provider Architecture

The system must support two AI modes.

Primary mode:

OpenRouter Free Models

Used for:

- Chat
- Reasoning
- Summaries
- Recommendations

Secondary mode:

Ollama local model

Model:

Qwen2.5-VL

Used for:

- Document vision understanding
- Image interpretation
- Table extraction
- Diagram understanding

---

# 2.8 AI Fallback Behaviour

The system must automatically handle provider failures.

Flow:

User Request

↓

Try OpenRouter

↓

Successful Response

↓

Return Answer

If unavailable:

↓

Use Ollama Qwen2.5-VL

↓

Return Answer

The user should also have the ability to manually select the preferred AI provider.

---

# 2.9 Machine Learning Stack

Use:

Python

pandas

numpy

scikit-learn

XGBoost

Initial ML models:

- Mud loss prediction
- Kick prediction
- Stuck pipe prediction
- Torque anomaly detection
- Formation instability prediction

The architecture should allow future replacement with:

Deep learning models

Time-series transformers

Advanced drilling models

---

# PART 3

# DATABASE ARCHITECTURE AND PETROLEUM DATA MODEL

## 3.1 Database Design Philosophy

The database must represent a realistic oil and gas drilling knowledge ecosystem.

Do not create a flat "wells" table with random information.

A drilling operation has hierarchy and relationships.

The database structure must represent:

Geological hierarchy

↓

Operational hierarchy

↓

Knowledge hierarchy

↓

Time-series hierarchy

The main intelligence relationship is:

Basin

↓

Field

↓

Block / Asset

↓

Well

↓

Wellbore

↓

Formation Interval

↓

Drilling Event

↓

Mitigation Knowledge

↓

Lesson Learned

Telemetry and documents are connected to the same knowledge graph.

---

# 3.2 Core Database Modules

Create database modules:

## Identity Module

Stores:

- Users
- Roles
- Permissions

---

## Geological Module

Stores:

- Basins
- Fields
- Blocks
- Formations
- Reservoirs

---

## Well Intelligence Module

Stores:

- Wells
- Wellbores
- Trajectories
- Surveys

---

## Operational Knowledge Module

Stores:

- Drilling events
- Incidents
- Mitigation actions
- Lessons learned

---

## Document Intelligence Module

Stores:

- Documents
- Document pages
- Extracted entities
- Embeddings

---

## Live Operations Module

Stores:

- Telemetry
- Real-time measurements
- Risk predictions

---

## Reporting Module

Stores:

- Generated reports
- Report history

---

## AI Assistant Module

Stores:

- Conversations
- Messages
- Context selection

---

# 3.3 User and Role System

The system requires role-based access control.

Roles:

## Admin

Purpose:

Complete system administration.

Permissions:

- User management
- Dataset management
- AI configuration
- Document management
- System settings

---

## Drilling Engineer

Purpose:

Operational decision making.

Permissions:

- View active wells
- Analyze offset wells
- Access documents
- Use AI assistant
- Generate reports
- View risk predictions

---

## Management

Purpose:

Operational overview.

Permissions:

- View dashboards
- View analytics
- View reports
- Read-only access

---

# 3.4 User Table

Table:

users

Fields:

id

name

email

password_hash

role_id

is_active

created_at

updated_at

---

# 3.5 Roles Table

Table:

roles

Fields:

id

name

description

Example values:

Admin

Drilling Engineer

Management

---

# 3.6 Basin Model

A basin represents a geological petroleum region.

Table:

basins

Fields:

id

name

description

region

state

geological_age

created_at

Example:

Assam Shelf Basin

Cambay Basin

Krishna Godavari Basin

---

# 3.7 Field Model

A field represents a producing or exploration area.

Table:

fields

Fields:

id

basin_id

name

description

operator

latitude

longitude

boundary_geometry

discovery_year

Relationship:

One basin contains many fields.

---

# 3.8 Block / Asset Model

A field may contain multiple operational blocks.

Table:

blocks

Fields:

id

field_id

name

contract_type

operator

partners

---

# 3.9 Well Model

The well is the primary intelligence object.

A well is not only a location.

It represents:

A drilling history.

A geological journey.

An operational experience.

Table:

wells

Fields:

Identity:

id

well_name

well_number

Location:

field_id

block_id

latitude

longitude

Classification:

well_purpose

well_status

production_status

trajectory_type

Depth:

planned_depth

total_depth

current_depth

Dates:

spud_date

completion_date

abandonment_date

Reservoir:

reservoir_type

hydrocarbon_type

Metadata:

created_at

updated_at

---

# 3.10 Well Purpose Dimension

Purpose explains why the well exists.

Do not mix purpose with status.

Allowed values:

Exploratory

Purpose:

Find new hydrocarbons.

---

Appraisal

Purpose:

Evaluate discovered reservoir.

---

Development

Purpose:

Production drilling.

---

Injection

Purpose:

Water or gas injection.

---

Observation

Purpose:

Monitoring reservoir behaviour.

---

# 3.11 Well Status Dimension

Status represents lifecycle state.

Allowed:

Planned

Meaning:

Approved but not started.

---

Spudded

Meaning:

Drilling started.

---

Drilling

Meaning:

Currently drilling.

---

Completed

Meaning:

Construction completed.

---

Testing

Meaning:

Under evaluation.

---

Producing

Meaning:

Active production.

---

Suspended

Meaning:

Temporarily inactive.

---

Abandoned

Meaning:

Permanently closed.

---

# 3.12 Production Status Dimension

Values:

Oil Producer

Gas Producer

Condensate Producer

Water Injector

Gas Injector

Non Producing

Shut In

---

# 3.13 Trajectory Dimension

Trajectory describes well geometry.

Allowed:

## Vertical

Almost straight vertical drilling.

## Directional

Well intentionally deviates from vertical.

## Horizontal

Extended horizontal reservoir contact.

## Multilateral

Multiple branches from one wellbore.

---

Store:

Maximum inclination

Maximum azimuth

Maximum dogleg severity

---

# 3.14 Wellbore Model

A well may have multiple wellbores.

Example:

Well:

Duliajan-10

Wellbore 1:

Original hole

Wellbore 2:

Sidetrack

---

Table:

wellbores

Fields:

id

well_id

name

status

trajectory_type

sidetrack_number

kickoff_depth

total_depth

---

# 3.15 Trajectory Survey Model

Directional surveys provide actual well path.

Table:

trajectory_surveys

Fields:

id

wellbore_id

measured_depth

inclination

azimuth

true_vertical_depth

northing

easting

dogleg_severity

Used for:

- 3D visualization
- Collision analysis
- Well comparison

---

# 3.16 Formation Model

Formation is a critical intelligence dimension.

A drilling risk is often formation-dependent.

Table:

formations

Fields:

id

basin_id

name

geological_age

lithology

description

Example:

Barail Formation

Tipam Formation

Bassein Formation

---

# 3.17 Formation Interval Model

A well encounters multiple formations.

Table:

formation_intervals

Fields:

id

well_id

formation_id

top_depth

bottom_depth

lithology

reservoir_quality

Example:

Well:

ABC-01

Formation:

Barail

Interval:

3200m - 3500m

---

# 3.18 Reservoir Model

Table:

reservoirs

Fields:

id

formation_id

name

reservoir_type

porosity

permeability

pressure

---

# 3.19 Drilling Event Intelligence Model

A drilling event represents an operational occurrence.

Examples:

Lost circulation

Kick

Stuck pipe

Torque increase

Formation instability

Cement failure

The event model is one of the most important knowledge sources.

---

# 3.20 Drilling Events Table

Table:

drilling_events

Fields:

id

well_id

wellbore_id

formation_id

event_type

severity

start_depth

end_depth

description

cause

consequence

npt_hours

event_start_time

event_end_time

---

# 3.21 Event Categories

## Well Control

Events:

Kick

Gas influx

Overpressure

---

## Lost Circulation

Events:

Partial loss

Severe loss

Complete loss

---

## Mechanical

Events:

Stuck pipe

Pack off

Fishing

BHA failure

---

## Formation Related

Events:

Cavings

Collapse

Instability

---

## Drilling Parameter Abnormalities

Events:

Torque spike

Drag increase

ROP reduction

Pressure anomaly

---

# 3.22 Event Severity

Values:

Information

Low

Moderate

High

Critical

---

# 3.23 Mitigation Knowledge Model

Every important event should have mitigation history.

Table:

mitigations

Fields:

id

event_id

action_taken

procedure

materials_used

result

effectiveness_score

Example:

Event:

Lost circulation

Action:

LCM treatment

Result:

Circulation restored

---

# 3.24 Lessons Learned Model

This stores institutional memory.

Table:

lessons_learned

Fields:

id

event_id

well_id

formation_id

depth_range

lesson_text

recommended_action

applicable_conditions

Example:

"Prepare additional lost circulation material before entering fractured sandstone intervals."

---

# PART 4

# DOCUMENT INTELLIGENCE, AI KNOWLEDGE, TELEMETRY AND INTELLIGENCE DATA MODEL

# 4.1 Document Intelligence Philosophy

A major challenge in drilling operations is that valuable knowledge exists inside unstructured documents.

Examples:

- Daily Drilling Reports
- Well Completion Reports
- Mud Logging Reports
- Geological Reports
- Cementing Reports
- Casing Reports

The system must convert these documents into structured institutional memory.

The document system must preserve:

Original document

↓

Page-level content

↓

Extracted text

↓

Tables

↓

Images

↓

Diagram descriptions

↓

Operational entities

↓

Vector embeddings

↓

Searchable knowledge

The AI system should never answer only from generated knowledge.

It must always be able to trace information back to source documents.

---

# 4.2 Document Storage Model

Documents must be stored at multiple levels.

Level 1:

Original File

Stores:

- PDF
- DOCX
- XLSX
- Image

Purpose:

Maintain original evidence.

---

Level 2:

Page Storage

Each document is split into pages.

Purpose:

Allow precise citation.

---

Level 3:

Knowledge Extraction

AI extracts:

- Wells
- Depths
- Formations
- Events
- Parameters
- Mitigations

---

Level 4:

Vector Knowledge

Embeddings allow semantic search.

---

# 4.3 Documents Table

Table:

documents

Fields:

id

well_id

document_type

file_name

original_path

file_hash

file_size

mime_type

page_count

upload_date

uploaded_by

processing_status

---

# 4.4 Document Type Dimension

Values:

Daily Drilling Report

Purpose:

Daily operational activities.

---

Well Completion Report

Purpose:

Final well construction details.

---

Mud Logging Report

Purpose:

Shows drilling parameter and hydrocarbon indications.

---

Geological Report

Purpose:

Formation and subsurface information.

---

Casing Report

Purpose:

Casing design and execution.

---

Cementing Report

Purpose:

Cement job details.

---

# 4.5 Document Duplicate Detection

Every uploaded document must generate:

SHA-256 hash

Before processing:

Upload

↓

Calculate Hash

↓

Search Existing Hash

↓

If Exists:

Reject Duplicate

↓

If New:

Continue Processing

The system must avoid duplicate AI processing.

---

# 4.6 Document Pages Table

Table:

document_pages

Fields:

id

document_id

page_number

image_path

raw_text

markdown_content

processing_status

Purpose:

Every AI answer can reference exact pages.

---

# 4.7 Markdown Preservation Requirement

Converted markdown must preserve:

Text

Tables

Lists

Headings

Example:

Original table:

Depth | Formation | Event

Converted:

Markdown table with same structure.

---

# 4.8 Visual Understanding Requirement

The AI vision model must understand:

Images

Charts

Diagrams

Handwritten annotations

If a visual cannot be stored directly, convert it into descriptive markdown.

Example:

Original:

Directional trajectory diagram

Stored:

"Well trajectory deviates eastward after 2500m measured depth and reaches maximum inclination of 65 degrees at 3400m."

---

# 4.9 Extracted Entities Table

Store extracted knowledge separately.

Table:

document_entities

Fields:

id

document_page_id

entity_type

entity_value

depth_reference

confidence_score

Example:

Entity Type:

FORMATION

Value:

Barail Formation

Depth:

3200m

---

# 4.10 Knowledge Embedding Model

The system requires semantic retrieval.

Use:

PostgreSQL pgvector

Store embeddings for:

- Document pages
- Lessons learned
- Event descriptions
- Mitigation procedures

---

Table:

knowledge_embeddings

Fields:

id

source_type

source_id

content

embedding_vector

created_at

---

# 4.11 AI Source Citation Model

Every AI-generated response must support:

Source document

Page number

Well

Depth

Create:

knowledge_references

Fields:

id

response_id

document_id

page_number

reference_text

---

# 4.12 Telemetry Data Architecture

Telemetry represents real-time drilling operations.

It must support:

Live streaming

Historical analysis

Machine learning

Anomaly detection

Because telemetry volume is high, use:

TimescaleDB extension.

---

# 4.13 Telemetry Table

Table:

rig_telemetry

Fields:

id

well_id

timestamp

measured_depth

vertical_depth

rop

wob

rpm

torque

standpipe_pressure

ecd

mud_weight

flow_rate

hook_load

temperature

---

# 4.14 Telemetry Rules

Telemetry data must behave realistically.

Depth:

Must continuously increase.

Parameters:

Must correlate with:

- Formation
- Depth
- Drilling operation

---

# 4.15 Telemetry Simulator Model

The system must include a drilling simulator.

Purpose:

Demonstrate real-time intelligence without requiring actual rig data.

Modes:

Automatic Mode

Custom Mode

---

# 4.16 Automatic Simulator Mode

The simulator automatically generates:

Depth progression

Drilling parameters

Formation changes

Risk conditions

Example:

Depth increases:

3000m

3010m

3020m

System evaluates:

Current formation

Historical events

Risk probability

---

# 4.17 Custom Simulator Mode

Users can control:

Starting depth

Depth increment

ROP

RPM

WOB

Torque

Mud weight

ECD

Flow rate

Formation

Drilling speed

Purpose:

Allow demonstrations of different scenarios.

---

# 4.18 Risk Prediction Model

The risk engine predicts future operational problems.

Table:

risk_predictions

Fields:

id

well_id

depth

risk_type

probability

confidence

severity

historical_frequency

similarity_score

generated_time

---

# 4.19 Risk Types

Include:

Mud Loss

Kick

Stuck Pipe

Torque Spike

Formation Instability

Cementing Risk

---

# 4.20 Risk Intelligence Logic

Risk prediction should combine:

Machine Learning

Historical Similar Wells

Formation Knowledge

Current Telemetry

Example:

Current well:

Depth:

3400m

Formation:

Barail

Historical:

7 nearby wells experienced mud loss between 3350m-3500m.

ML prediction:

Mud loss probability: 82%

---

# 4.21 Similar Well Intelligence Model

Create:

well_similarity_scores

Fields:

id

current_well_id

offset_well_id

distance_km

formation_similarity

trajectory_similarity

event_similarity

overall_similarity

---

# 4.22 AI Assistant Data Model

The drilling assistant requires persistent conversations.

---

Table:

chat_sessions

Fields:

id

user_id

title

context_type

context_id

created_at

updated_at

---

# 4.23 Chat Context Types

The user can change context.

Examples:

General

Specific Well

Specific Field

Specific Formation

Specific Event

---

# 4.24 Chat Messages Table

Table:

chat_messages

Fields:

id

session_id

role

message

sources

created_at

---

# 4.25 Report Storage Model

Generated reports must be tracked.

Table:

reports

Fields:

id

user_id

well_id

report_type

format

file_path

created_at

---

# 4.26 Report Types

Include:

Active Well Intelligence Report

Offset Well Analysis Report

Field Intelligence Report

Management Summary Report

---

# 4.27 Database Design Completion Requirement

Before implementing frontend features, ensure:

All relationships are defined.

All migrations work.

Seed data can populate every table.

The database must support:

GIS

AI

ML

Reports

Telemetry

Chat

---

# PART 5

# SYNTHETIC PETROLEUM DATA GENERATION AND DATABASE INITIALIZATION SYSTEM

# 5.1 Purpose

The system must include a complete synthetic petroleum data generation framework.

The purpose is not to create dummy rows.

The purpose is to create a realistic miniature version of an Oil & Gas operational knowledge database.

The generated dataset must support:

- GIS visualization
- Offset well intelligence
- AI document retrieval
- Machine learning training
- Risk prediction
- Report generation
- Dashboard analytics

---

# 5.2 Data Generation Philosophy

The generated data must behave like real petroleum operational data.

Relationships must make geological and operational sense.

Example:

A well in Assam Shelf Basin should not randomly have Mumbai Offshore geological formations.

A horizontal development well should have different drilling characteristics compared to an exploration vertical well.

A stuck pipe event should have a relationship with:

- Depth
- Formation
- Trajectory
- Drilling parameters

---

# 5.3 Dataset Scale

Generate approximately:

## Geological Data

Minimum:

8 petroleum basins

25+ fields

50+ blocks/assets

---

## Well Data

Generate:

100 complete wells

Recommended:

100-120 wells

Each well represents a complete operational history.

---

## Operational Data

Generate:

500+ drilling events

500+ mitigation records

500+ lessons learned records

---

## Telemetry Data

Generate:

Minimum:

50,000 telemetry records

Recommended:

100,000+ records

---

## Document Data

Generate:

300+ synthetic documents

Multiple pages per document

---

# 5.4 Dataset Folder Structure

Create:

dataset/

```
basins.csv


fields.csv


blocks.csv


wells.csv


wellbores.csv


trajectory_surveys.csv


formations.csv


formation_intervals.csv


reservoirs.csv


drilling_events.csv


mitigations.csv


lessons_learned.csv


documents.csv


document_pages.csv


telemetry_history.csv


ml_training_labels.csv
```

---

# 5.5 Indian Petroleum Basin Coverage

Include realistic Indian petroleum regions.

Examples:

## Assam Shelf Basin

Fields:

- Duliajan
- Naharkatiya
- Moran
- Digboi

---

## Assam-Arakan Basin

Fields:

- Lakwa
- Rudrasagar
- Jorhat

---

## Cambay Basin

Fields:

- Ankleshwar
- Kalol
- Gandhar

---

## Mumbai Offshore Basin

Fields:

- Mumbai High
- Bassein
- Neelam

---

## Krishna-Godavari Basin

Fields:

- KG Offshore
- KG Onshore

---

## Rajasthan Basin

Fields:

- Mangala
- Bhagyam

---

## Cauvery Basin

Fields:

- Cauvery Offshore
- PY-3

---

## Bengal Basin

Fields:

- Multiple exploration areas

---

# 5.6 Geographic Data Rules

Coordinates must be realistic.

Do not randomly distribute wells.

Wells belonging to the same field must be geographically clustered.

Example:

Field:

Duliajan

Well A:

27.3551

94.9032

Well B:

27.3564

94.9045

Distance:

Hundreds of meters to a few kilometres.

---

# 5.7 Well Dataset Requirements

Every well must include:

Identity:

- Well ID
- Well Name

Location:

- Latitude
- Longitude

Classification:

- Basin
- Field
- Block

Operational:

- Purpose
- Status
- Production status

Geometry:

- Trajectory type
- Total depth
- Current depth

Dates:

- Spud date
- Completion date

---

# 5.8 Well Purpose Distribution

Generate realistic distribution.

Exploration:

15-20%

Appraisal:

15%

Development:

50-60%

Injection:

5-10%

Observation:

5%

---

# 5.9 Well Status Distribution

Include:

Planned

Drilling

Completed

Testing

Producing

Suspended

Abandoned

Recommended:

Producing:

35%

Completed:

20%

Drilling:

15%

Testing:

5%

Suspended:

10%

Abandoned:

10%

Planned:

5%

---

# 5.10 Trajectory Distribution

Include:

## Vertical

Approximately:

40%

---

## Directional

Approximately:

45%

---

## Horizontal

Approximately:

10%

---

## Multilateral

Approximately:

5%

---

# 5.11 Formation Dataset

Create realistic formations.

Examples:

Assam:

- Barail Formation
- Tipam Formation
- Surma Formation

Cambay:

- Kalol Formation
- Hazad Formation

Mumbai Offshore:

- Bassein Formation
- Mukta Formation

Rajasthan:

- Fatehgarh Formation

KG Basin:

- Raghavapuram Formation

---

# 5.12 Formation Relationship Rules

A well should encounter multiple formations.

Example:

Well:

Duliajan-12

Formation sequence:

Surma:

0m-1200m

Tipam:

1200m-2500m

Barail:

2500m-3800m

---

# 5.13 Event Generation System

Operational events must be realistic.

Do not randomly attach events.

Events depend on:

Formation

Depth

Trajectory

Well type

Historical probability

---

# 5.14 Event Categories

Generate:

## Lost Circulation

Examples:

- Partial loss
- Severe loss
- Complete loss

---

## Well Control

Examples:

- Kick
- Gas influx
- Pressure anomaly

---

## Mechanical

Examples:

- Stuck pipe
- Pack off
- Fishing operation

---

## Formation Related

Examples:

- Collapse
- Cavings
- Instability

---

## Parameter Abnormalities

Examples:

- Torque spike
- Drag increase
- ROP reduction

---

# 5.15 Event Generation Logic

Example:

Formation:

Fractured sandstone

Higher probability:

Lost circulation

---

Formation:

Reactive shale

Higher probability:

Hole instability

---

High pressure zone:

Higher probability:

Kick

---

# 5.16 Telemetry Generation Logic

Telemetry should simulate actual drilling.

Depth progression:

Must be sequential.

Example:

2500m

2505m

2510m

---

Parameters:

Must correlate.

Example:

Increasing depth:

Temperature increases.

Higher WOB:

ROP may increase.

Formation change:

ROP and torque may change.

---

# 5.17 Pre-Event Pattern Generation

Before an incident occurs, telemetry should show warning patterns.

Example:

Before stuck pipe:

- Increasing torque
- Increasing hook load
- Decreasing ROP

---

Before mud loss:

- ECD fluctuation
- Flow imbalance
- Pressure changes

---

Before kick:

- Flow increase
- Pressure abnormality

---

# 5.18 Machine Learning Labels

Generate training labels.

File:

ml_training_labels.csv

Fields:

record_id

well_id

depth

risk_type

label

severity

---

# 5.19 First Startup Database Seeding

The application must automatically initialize itself.

Workflow:

Application starts

↓

Check database status

↓

If database empty

↓

Run synthetic generator

↓

Create CSV files

↓

Insert data

↓

Generate embeddings

↓

Create demo environment

---

# 5.20 Seed Requirements

The seed process must be:

Automatic

Repeatable

Safe

It must support:

Fresh installation

Development reset

Testing environment

---

# 5.21 Duplicate Protection

Use:

Database constraints

Unique keys

Upsert operations

Running seed twice must not duplicate data.

---

# 5.22 Dataset Validation

Before inserting data, validate:

Geographical correctness

Foreign key integrity

Depth consistency

Formation relationships

Event relationships

Telemetry continuity

---

# 5.23 Dataset Completion Criteria

The generated dataset should allow a user to:

Open map:

See Indian fields and wells.

Open a well:

See history.

Ask AI:

"Have nearby wells experienced mud loss in this formation?"

Generate report:

Get meaningful information.

Run ML:

Train prediction models.

---

# PART 6

# DOCUMENT INTELLIGENCE, AI PROCESSING PIPELINE AND RAG KNOWLEDGE SYSTEM

# 6.1 Purpose

The document intelligence system is the core institutional memory component of NWIS.

The objective:

Convert thousands of historical drilling documents into structured, searchable operational knowledge.

The system must transform:

Unstructured documents

↓

Machine understandable knowledge

↓

Searchable intelligence

↓

AI recommendations

---

# 6.2 Supported Document Types

The system must support:

## Drilling Documents

- Daily Drilling Reports (DDR)
- Drilling Summary Reports
- Drilling Program Documents

---

## Completion Documents

- Well Completion Reports (WCR)
- Completion Summary
- Casing Reports
- Cementing Reports

---

## Geological Documents

- Geological Reports
- Formation Reports
- Reservoir Reports
- Well Logs

---

## Operational Documents

- Mud Logging Reports
- Incident Reports
- Lessons Learned Reports

---

# 6.3 Document Upload Workflow

The complete workflow:

User uploads document

↓

Validate file

↓

Calculate SHA-256 hash

↓

Check duplicate

↓

Store original file

↓

Split into pages

↓

Vision processing

↓

Text extraction

↓

Markdown conversion

↓

Entity extraction

↓

Embedding generation

↓

Knowledge storage

↓

Available for AI retrieval

---

# 6.4 File Validation

Before processing:

Validate:

File type

File size

Corruption

Security

Supported:

PDF

DOCX

XLSX

PNG

JPEG

TIFF

---

# 6.5 Duplicate Detection

Every document must have a SHA-256 hash.

Example:

Document:

DDR_Duliajan_001.pdf

Hash:

a8f82d91xxxx

Before processing:

Search existing hash.

If found:

Do not process again.

Show:

"Document already exists in knowledge repository."

---

# 6.6 Page-Level Processing

Documents must be processed page-by-page.

Do not store only final extracted text.

Each page must maintain:

Original page image

Extracted markdown

Extracted entities

Embedding vector

Source reference

---

# 6.7 Document Storage Structure

Example:

storage/

documents/

```
DDR_Duliajan_001.pdf
```

pages/

```
DDR_Duliajan_001/


    page_001.png

    page_002.png
```

markdown/

```
DDR_Duliajan_001/


    page_001.md

    page_002.md
```

---

# 6.8 AI Vision Processing

Primary vision model:

Qwen2.5-VL through Ollama

The model must understand:

Text

Tables

Charts

Diagrams

Images

Handwritten notes

---

# 6.9 Why Vision AI Is Required

Traditional OCR only extracts characters.

Oil and gas documents contain:

- Directional trajectory plots
- Geological sections
- Mud charts
- Pressure graphs
- Tables
- Annotated diagrams

The system must understand meaning, not only text.

---

# 6.10 Markdown Conversion Rules

All processed pages must be converted into markdown.

Preserve:

Headings

Tables

Lists

Numbers

Units

Depth references

---

# 6.11 Table Preservation

Example:

Original:

Depth | Formation | Event

3200m | Barail | Mud Loss

Stored:

Markdown table with identical information.

---

# 6.12 Chart Understanding

Charts must not be discarded.

Convert them into descriptions.

Example:

Original:

ROP chart

Generated markdown:

"ROP gradually decreased from 18 m/hr to 5 m/hr between 3200m and 3450m while drilling through unstable shale formation."

---

# 6.13 Diagram Understanding

Diagrams must become searchable knowledge.

Example:

Original:

Directional well trajectory diagram

Stored:

"The well trajectory starts vertically and gradually builds inclination after 1800m measured depth. Maximum inclination reached 62 degrees at 3400m MD."

---

# 6.14 Entity Extraction

The AI must extract petroleum entities.

Required entities:

Well name

Field

Basin

Formation

Depth

Trajectory

Drilling parameter

Incident

Mitigation

Equipment

Date

---

# 6.15 Entity Confidence

Every extraction must store confidence.

Example:

Entity:

Barail Formation

Confidence:

96%

---

# 6.16 Knowledge Chunking

Documents must be divided into meaningful chunks.

Do not create arbitrary text chunks only.

Chunks should consider:

Sections

Depth intervals

Operational events

Formation boundaries

---

# 6.17 Chunk Example

Bad:

Random 1000-character split.

Good:

Chunk:

"Lost circulation event while drilling Barail Formation between 3400m-3500m."

---

# 6.18 Embedding Generation

Generate embeddings for:

Document pages

Knowledge chunks

Lessons learned

Mitigation procedures

Event descriptions

---

# 6.19 Vector Database

Use:

PostgreSQL pgvector

Store:

Embedding vector

Original content

Metadata

Source reference

---

# 6.20 Retrieval Augmented Generation Architecture

The AI assistant must use RAG.

Flow:

User question

↓

Understand context

↓

Generate search query

↓

Vector similarity search

↓

Retrieve relevant knowledge

↓

Combine with operational context

↓

Send to AI model

↓

Generate answer

↓

Attach sources

---

# 6.21 Source Citation Requirement

Every AI answer must provide evidence.

Example:

Answer:

"Similar mud loss occurred in nearby wells."

Sources:

DDR_Duliajan_12.pdf

Page 27

WCR_Duliajan_08.pdf

Page 15

---

# 6.22 AI Provider Architecture

The system supports two AI providers.

## Provider 1

OpenRouter Free Models

Default.

Used for:

Chat

Reasoning

Summarization

Recommendations

---

## Provider 2

Ollama Local Model

Model:

Qwen2.5-VL

Used for:

Vision processing

Local AI inference

Offline capability

---

# 6.23 AI Provider Configuration

Store:

AI_PROVIDER

OPENROUTER_API_KEY

OLLAMA_URL

MODEL_NAME

in:

environment variables

---

# 6.24 Provider Switching

Users with permission can switch:

OpenRouter

Ollama

The UI should clearly show current provider.

---

# 6.25 AI Failure Handling

If OpenRouter fails:

Automatically attempt Ollama.

If both fail:

Return meaningful error.

Do not silently fail.

---

# 6.26 AI Response Structure

The assistant response should contain:

Answer

Reasoning summary

Historical evidence

Recommended action

Sources

---

# 6.27 Document Intelligence API

Create APIs:

POST

/api/documents/upload

Upload document.

---

GET

/api/documents

List documents.

---

GET

/api/documents/{id}/pages

View processed pages.

---

POST

/api/documents/process

Start AI processing.

---

# 6.28 Document Processing Status

Track:

Uploaded

Processing

Extracting

Embedding

Completed

Failed

---

# 6.29 Document Viewer Requirement

The frontend must provide:

Original document viewer

Page navigation

Extracted markdown viewer

AI extracted entities

Source references

---

# 6.30 Completion Criteria

The document intelligence system is complete when:

A user can upload a drilling report.

The system automatically:

- Detects duplicates.
- Understands pages.
- Converts to markdown.
- Extracts drilling knowledge.
- Creates embeddings.
- Allows AI search.
- Provides page-level citations.

---

# PART 7

# DRILLING ASSISTANT AI AND LIVE RIG INTELLIGENCE SYSTEM

# 7.1 Purpose

This module is the operational heart of NWIS.

The goal is to create a digital drilling companion that continuously understands:

Current drilling operation

Historical offset well behaviour

Formation risks

Operational experience

The system should help engineers answer:

"What is happening now?"

"What happened before in nearby wells?"

"What could happen next?"

"What should I prepare for?"

---

# 7.2 Drilling Assistant Overview

Create a dedicated AI assistant page.

Route:

/assistant

The assistant is not a generic chatbot.

It must be a domain-aware drilling intelligence assistant.

---

# 7.3 Assistant Capabilities

The assistant must answer questions related to:

Wells

Fields

Basins

Formations

Historical incidents

Mitigation procedures

Drilling parameters

Reports

Documents

Risk predictions

---

# 7.4 Conversation Management

The system must store conversations permanently.

Features:

Create chat

Rename chat

Delete chat

Search previous chats

Continue previous conversation

---

# 7.5 Chat Context System

The user must be able to change the AI context.

Context options:

## Global Context

The assistant can search all available knowledge.

---

## Well Context

Example:

"Analyze Well Duliajan-12"

The assistant prioritizes:

- Current well data
- Offset wells
- Related documents

---

## Field Context

Example:

"Analyze Mumbai High field"

---

## Formation Context

Example:

"Explain Barail Formation risks"

---

## Event Context

Example:

"Show historical stuck pipe incidents"

---

# 7.6 Context Selector UI

The chat page should contain a context selector.

Example:

Current Context:

Well:

Duliajan-12

Formation:

Barail

Depth:

3400m

The selected context is sent with every AI request.

---

# 7.7 Assistant Response Format

Every response should follow a structured format.

Example:

## Analysis

Explanation of situation.

## Historical Evidence

Similar wells and events.

## Risk Assessment

Potential future issues.

## Recommendation

Suggested mitigation.

## Sources

Document references.

---

# 7.8 AI Knowledge Priority

When answering:

Priority order:

Current telemetry data

Current well information

Similar offset wells

Historical documents

General petroleum knowledge

---

# 7.9 Chat Database Integration

Every conversation must store:

User

Context

Messages

Sources used

Timestamp

---

# 7.10 Live Rig Intelligence Module

Create a dedicated page:

Route:

/live-monitoring

Purpose:

Simulate a real-time drilling operation.

---

# 7.11 Page Layout Requirement

The layout should be carefully designed.

Main structure:

Left:

Current drilling well visualization

Center:

Live depth and formation intelligence

Right:

Offset well historical intelligence

Bottom:

Telemetry charts and risk indicators

---

# 7.12 Current Well Panel

Display:

Well name

Field

Basin

Current depth

Target depth

Trajectory type

Current formation

Drilling status

---

# 7.13 Live Depth Visualization

Create a vertical drilling depth timeline.

The visualization must show:

A live depth indicator moving downward.

Example:

Surface

|

|

Formation A

|

|

Formation B

|

● Current Depth

|

|

Formation C

---

# 7.14 Depth Scale

The depth scale must remain fixed.

Example:

0m

500m

1000m

1500m

2000m

2500m

3000m

The current drilling depth moves along this scale.

---

# 7.15 Formation Display

Every formation interval must appear on the depth track.

Example:

0m-1000m

Shale Formation

1000m-2800m

Sandstone Formation

2800m-3600m

Barail Formation

---

# 7.16 Offset Well Intelligence Panel

The right side should display nearby wells.

For every offset well show:

Well name

Distance

Similarity score

Historical incidents

Depth of incidents

Formation

---

# 7.17 Offset Incident Alignment

Historical incidents must align with depth.

Example:

Current Well:

Depth:

3400m

Offset Well Event:

Duliajan-08

Mud Loss

Depth:

3420m

Display:

"Similar event occurred 20m below current depth"

---

# 7.18 Incident Filters

Users should filter incidents by:

Event type

Severity

Formation

Depth range

Well

Date

---

# 7.19 Risk Prediction Visualization

The system must show future risks ahead of current depth.

Example:

Current depth:

3200m

Predicted risks:

3400m-3500m

Mud Loss Risk

Confidence:

82%

3600m

Torque Spike Risk

Confidence:

67%

---

# 7.20 Risk Information

Each risk must display:

Risk type

Depth interval

Formation

Confidence score

Historical frequency

Similarity score

Severity

---

# 7.21 Risk Calculation Logic

Risk should combine:

Machine Learning Prediction

Offset Well Similarity

Historical Frequency

Formation Knowledge

Current Telemetry

---

# 7.22 Telemetry Simulator

The platform must include a rig telemetry simulator.

Purpose:

Allow demonstration without live rig connection.

---

# 7.23 Simulator Modes

Two modes are required.

## Automatic Mode

The system automatically simulates:

Depth progression

Drilling parameters

Formation changes

Risk evolution

---

## Custom Mode

The user controls:

Starting depth

Depth increment

ROP

WOB

RPM

Torque

Mud weight

ECD

Flow rate

---

# 7.24 Simulator Behaviour

The simulator should behave realistically.

Example:

As depth increases:

Formation changes.

Telemetry changes.

Risk calculation updates.

AI recommendations change.

---

# 7.25 WebSocket Streaming

Use WebSockets.

Flow:

Simulator

↓

Backend WebSocket

↓

Frontend Live Dashboard

---

# 7.26 Telemetry Update Frequency

For demonstration:

Update every few seconds.

The architecture must allow future:

Real-time rig stream integration.

---

# 7.27 Live Alert System

When risk increases:

Generate alerts.

Example:

Alert:

"High probability of lost circulation expected within next 80m."

Include:

Risk

Depth

Confidence

Evidence

---

# 7.28 Live Monitoring API

Create:

GET

/api/live/well/{id}

Returns:

Current state.

---

WebSocket:

/ws/telemetry/{well_id}

Streams:

Telemetry updates.

---

GET

/api/live/risks/{well_id}

Returns:

Predicted risks.

---

# 7.29 Completion Criteria

The live intelligence system is complete when:

A user can start a simulated drilling operation.

The screen shows:

- Moving depth indicator.
- Current formation.
- Live telemetry.
- Nearby wells.
- Historical incidents.
- Future risks.
- AI recommendations.

---

# PART 8

# GIS INTELLIGENCE, WELL VISUALIZATION AND FRONTEND APPLICATION ARCHITECTURE

# 8.1 Purpose

The GIS module provides spatial understanding of drilling operations.

The objective is to allow engineers to visually understand:

Where wells are located.

Which wells are nearby.

Which wells have similar geological conditions.

Where historical problems occurred.

The map is not only a location viewer.

It is an intelligence interface.

---

# 8.2 GIS Technology

Use:

Primary:

MapLibre GL JS

Optional advanced visualization:

CesiumJS

---

# 8.3 Map Design Philosophy

The map must follow the overall product design language.

Requirements:

Clean

Professional

Minimal

High information density

Avoid:

Excessive colors

Decorative elements

Unnecessary animations

---

# 8.4 Main Map Page

Route:

/map

The page should contain:

Main map area

Filter panel

Well information side panel

---

# 8.5 Field Visualization

Fields must be visually grouped.

Each field should display:

A large dashed circular boundary around the field cluster.

Purpose:

Immediately identify:

"These wells belong to this operational field."

---

# 8.6 Field Boundary Information

When hovering over a field boundary:

Show:

Field name

Basin

Number of wells

Active wells

Historical incidents

---

# 8.7 Well Markers

Every well should be represented by a circular marker.

Marker appearance depends on:

Well status

---

# 8.8 Well Status Colors

Use different marker colors for:

Planned

Drilling

Completed

Producing

Testing

Suspended

Abandoned

The color mapping must always be visible through legends.

---

# 8.9 Map Legend

The map must contain a legend panel.

Example:

Well Status:

● Drilling

● Producing

● Completed

Risk:

● High Risk

● Medium Risk

● Low Risk

---

# 8.10 Well Interaction

Every well marker must be clickable.

When clicked:

Open right-side information panel.

---

# 8.11 Well Detail Side Panel

The side panel should contain:

## Basic Information

Well name

Field

Basin

Coordinates

Status

Purpose

Trajectory

---

## Current Operation

Current depth

Formation

Drilling status

---

## Historical Intelligence

Nearby wells

Similarity score

Previous incidents

---

## Risk Intelligence

Future risks

Confidence

Severity

Historical frequency

---

## Documents

Available reports

DDR

WCR

Mud logs

---

# 8.12 Map Filters

Users should filter:

Basin

Field

Well status

Purpose

Trajectory type

Risk level

Event type

---

# 8.13 Search System

Provide:

Well search

Field search

Basin search

Example:

Search:

Duliajan

Results:

Show all related wells.

---

# 8.14 Offset Well Selection

Allow user to:

Select active well.

System automatically displays:

Nearby wells

Similarity ranking

Historical events

---

# 8.15 Distance Calculation

Calculate:

Distance between wells

Use:

Latitude

Longitude

Store:

Distance in kilometers.

---

# 8.16 Similarity Display

Example:

Selected Well:

ABC-01

Offset Well:

ABC-02

Similarity:

91%

Reasons:

Same formation

Similar trajectory

Same depth interval

---

# 8.17 3D Well Visualization

Optional advanced feature.

Use:

CesiumJS

Display:

Well trajectory

Depth

Formation intersections

---

# 8.18 3D Visualization Purpose

Allow engineers to understand:

Vertical separation

Directional paths

Reservoir contact

---

# 8.19 Frontend Application Structure

The frontend must be modular.

Recommended structure:

src/

```
app/


components/


pages/


layouts/


features/


hooks/


services/


store/


utils/
```

---

# 8.20 Layout Architecture

The application must NOT use a top navigation bar.

Use:

Sidebar only.

---

# 8.21 Sidebar Design

Default state:

Expanded.

Contains:

Logo area

Navigation items

User profile

Role information

---

# 8.22 Sidebar Behaviour

The sidebar must be collapsible.

Expanded:

Icon + label

Collapsed:

Icon only

---

# 8.23 Navigation Structure

Sidebar items:

Dashboard

Live Monitoring

Map Intelligence

Well Explorer

Documents

AI Assistant

Reports

Analytics

Settings

---

# 8.24 Dashboard Page

Route:

/dashboard

Purpose:

Provide operational overview.

Display:

Active drilling wells

Recent incidents

Risk summary

Field statistics

AI insights

---

# 8.25 Well Explorer Page

Route:

/wells

Purpose:

Search and analyze wells.

Features:

Table view

Filtering

Sorting

Detailed view

---

# 8.26 Well Detail Page

Route:

/wells/{id}

Display:

Complete well intelligence.

Sections:

Overview

Trajectory

Formation

Events

Documents

Offset Wells

Risks

Reports

---

# 8.27 Document Page

Route:

/documents

Features:

Upload documents

Processing status

Search knowledge

View extracted markdown

---

# 8.28 Analytics Page

Route:

/analytics

Display:

Field statistics

Event frequency

Risk trends

ML performance

Operational insights

---

# 8.29 Settings Page

Route:

/settings

Manage:

AI provider

User preferences

System configuration

---

# 8.30 UI Component Requirements

Create reusable components:

WellCard

RiskCard

IncidentCard

DataTable

ChartContainer

MapPanel

DocumentViewer

SourceReference

TelemetryChart

---

# 8.31 UI Quality Requirements

Every page must have:

Consistent spacing

Responsive layout

Loading states

Error states

Empty states

---

# 8.32 Frontend Completion Criteria

The frontend is complete when:

A user can:

Login

Navigate using sidebar

Open map

Select wells

View intelligence

Monitor live drilling

Use AI assistant

Generate reports

---

# PART 9

# REPORT GENERATION SYSTEM, API ARCHITECTURE AND SECURITY

# 9.1 Purpose of Reporting System

The reporting system converts NWIS intelligence into professional operational documents.

The purpose is to eliminate manual preparation of drilling analysis reports.

A drilling engineer should be able to generate a complete intelligence report within seconds.

---

# 9.2 Supported Report Formats

The system must generate:

## PDF

Use:

ReportLab

---

## DOCX

Use:

python-docx

---

# 9.3 Report Types

Implement multiple report templates.

## Report Type 1

# Active Well Intelligence Report

Purpose:

Provide complete analysis of an active drilling operation.

---

## Report Type 2

# Offset Well Analysis Report

Purpose:

Compare current well with historical nearby wells.

---

## Report Type 3

# Field Intelligence Report

Purpose:

Provide field-level operational overview.

---

## Report Type 4

# Management Summary Report

Purpose:

Provide high-level operational insights.

---

# 9.4 Report Design Philosophy

Reports must look like professional petroleum engineering documents.

Requirements:

Clear structure

Technical accuracy

Readable tables

Professional formatting

Evidence references

Avoid:

Marketing style

Decorative elements

Excessive graphics

---

# 9.5 Report Header

Every page must contain:

eRTMAC-NWIS

Nearby Wells Intelligence System

Oil India Limited

Logo placeholder

---

# 9.6 Report Footer

Include:

Generated by:

eRTMAC-NWIS AI Platform

Generated date

Page number

---

# 9.7 Cover Page

Every report should contain:

Report title

Well name

Field

Basin

Date

Prepared user

System version

---

# 9.8 Executive Summary Section

The first section should summarize:

Current drilling status

Current depth

Formation

Detected risks

Recommended actions

Example:

"The current operation is drilling through Barail Formation at 3400m MD. Historical offset analysis identified similar lost circulation events in nearby wells."

---

# 9.9 Well Information Section

Include:

Well Details Table

Fields:

Well Name

Well ID

Field

Basin

Block

Latitude

Longitude

Purpose

Status

Trajectory

---

# 9.10 Drilling Status Section

Include:

Current depth

Target depth

Current operation

Current formation

---

# 9.11 Telemetry Analysis Section

Include:

Charts:

Depth vs Time

ROP trend

Torque trend

Pressure trend

ECD trend

---

# 9.12 Offset Well Section

Display:

Nearby wells table.

Columns:

Well Name

Distance

Similarity Score

Formation Match

Historical Events

---

# 9.13 Incident Analysis Section

Every incident should show:

Well

Depth

Formation

Event Type

Severity

NPT

Mitigation

---

# 9.14 Risk Intelligence Section

Display predicted future problems.

Every risk must include:

Risk type

Depth interval

Formation

Probability

Confidence

Historical frequency

Similarity score

Severity

---

# 9.15 AI Recommendation Section

Display:

Recommended action

Reason

Historical evidence

---

# 9.16 Source Evidence Section

Every AI-generated recommendation must include:

Document:

DDR_Duliajan_12.pdf

Page:

27

Related well:

Duliajan-08

Depth:

3400m-3500m

---

# 9.17 Report Builder UI

Create page:

/reports

Features:

View reports

Generate report

Download report

Delete report

---

# 9.18 Report Creation Workflow

User selects:

Report type

↓

Select well/field

↓

Select sections

↓

Generate report

↓

Backend processing

↓

Store file

↓

Display download

---

# 9.19 Report API

Create:

POST

/api/reports/generate

Request:

report_type

well_id

format

sections

Response:

report_id

status

file_path

---

# 9.20 Backend Architecture

The backend must be modular.

Recommended structure:

backend/

```
app/


    api/


    models/


    schemas/


    services/


    ai/


    ml/


    documents/


    reports/


    database/


    utils/
```

---

# 9.21 API Layer

Separate routers:

auth

users

wells

fields

documents

assistant

telemetry

risks

reports

analytics

---

# 9.22 Service Layer

Business logic must not exist inside routes.

Create services:

WellService

DocumentService

AIService

RiskService

TelemetryService

ReportService

---

# 9.23 Authentication System

Implement:

JWT authentication.

Workflow:

Login

↓

Validate credentials

↓

Generate token

↓

Access protected routes

---

# 9.24 Role Based Authorization

Every API endpoint must check permissions.

Example:

Admin:

Full access

Drilling Engineer:

Operational access

Management:

Read-only

---

# 9.25 Login Page Requirements

The prototype login page must contain:

Role selector

Available roles:

Admin

Drilling Engineer

Management

When role changes:

Automatically fill demo credentials.

Example:

Selected role:

Drilling Engineer

Auto-filled:

email

password

The user can login immediately.

---

# 9.26 Security Requirements

Implement:

Password hashing

JWT expiration

Input validation

File validation

API authorization

---

# 9.27 API Documentation

Generate:

OpenAPI documentation.

Include:

Endpoint description

Request format

Response format

Authentication requirement

---

# 9.28 Error Handling

Every API should return:

Success response

Error response

Validation messages

---

# 9.29 Logging

Implement structured logging.

Track:

API requests

AI processing

Document failures

ML predictions

Errors

---

# 9.30 Completion Criteria

Reporting and backend systems are complete when:

Users can:

Generate professional reports.

Reports contain:

Well information

Historical knowledge

Risk prediction

AI recommendations

Evidence references

Backend provides:

Secure APIs

Documentation

Proper architecture

---

# PART 10

# MACHINE LEARNING RISK ENGINE AND PREDICTIVE DRILLING INTELLIGENCE

# 10.1 Purpose

The ML risk engine is responsible for transforming historical drilling experience into predictive intelligence.

The objective is not only to display historical incidents.

The objective is to predict:

"What is likely to happen next based on current drilling behaviour and historical patterns?"

---

# 10.2 ML Architecture Philosophy

The ML system must work together with:

Historical well data

Real-time telemetry

Formation information

Offset well similarity

Document knowledge

The prediction engine should combine:

Machine Learning probability

Rule-based petroleum knowledge

Historical frequency

---

# 10.3 ML Pipeline Overview

Complete workflow:

Historical Data

↓

Data Cleaning

↓

Feature Engineering

↓

Model Training

↓

Model Validation

↓

Model Storage

↓

Real-time Inference

↓

Risk Generation

↓

Dashboard Visualization

---

# 10.4 Initial ML Models

Implement multiple independent models.

Required models:

Lost Circulation Prediction

Stuck Pipe Prediction

Kick / Well Control Risk Prediction

Torque Spike Prediction

Formation Instability Prediction

---

# 10.5 Model Development Strategy

For the prototype:

Use classical machine learning models first.

Reason:

- Faster training.
- Easier explanation.
- Works well with tabular drilling data.
- Suitable for SIH demonstration.

Architecture should allow future replacement with:

Deep learning

Time-series models

Transformer-based models

---

# 10.6 Recommended Algorithms

Use:

## XGBoost

Primary tabular prediction model.

---

## Random Forest

Secondary interpretable model.

---

## Isolation Forest

For anomaly detection.

---

## Logistic Regression

For baseline comparison.

---

# 10.7 Feature Engineering

The system must create meaningful drilling features.

Do not train only on raw telemetry.

---

# 10.8 Depth-Based Features

Include:

Current measured depth

Depth progression rate

Depth interval

Formation depth position

Distance to historical event depth

---

# 10.9 Drilling Parameter Features

Include:

ROP

Rate of penetration trend

WOB

Weight on bit

RPM

Torque

Hook load

Standpipe pressure

ECD

Mud weight

Flow rate

---

# 10.10 Trend Features

Calculate:

Moving average

Rate of change

Sudden variation

Deviation from normal behaviour

Example:

Torque increased 40% within 15 minutes.

---

# 10.11 Formation Features

Include:

Formation name

Lithology

Reservoir type

Historical instability rate

---

# 10.12 Well Similarity Features

Include:

Distance from offset wells

Formation similarity

Trajectory similarity

Depth similarity

Event similarity

---

# 10.13 Historical Event Features

Include:

Number of previous events:

Same field

Same formation

Same depth interval

Example:

Mud loss occurred:

8 times

within:

3300m-3500m

in same formation.

---

# 10.14 Training Dataset Structure

Create:

ml_training_dataset.csv

Columns:

well_id

depth

formation

trajectory

rop

wob

rpm

torque

ecd

mud_weight

pressure

flow_rate

previous_event_count

risk_type

label

---

# 10.15 Model Training Pipeline

Create:

ml/

```
models/


training/


preprocessing/


inference/
```

---

# 10.16 Training Workflow

Command:

python train_models.py

Process:

Load dataset

↓

Clean data

↓

Generate features

↓

Train models

↓

Evaluate

↓

Save models

---

# 10.17 Model Storage

Store:

models/

```
lost_circulation.pkl


stuck_pipe.pkl


kick.pkl


torque_anomaly.pkl
```

---

# 10.18 Model Metadata

Every model must store:

Model name

Version

Training date

Dataset size

Accuracy metrics

Feature list

---

# 10.19 Model Evaluation

Measure:

Accuracy

Precision

Recall

F1 Score

ROC-AUC

---

# 10.20 Explainable Prediction

Every prediction must explain why.

Example:

Prediction:

High Lost Circulation Risk

Reasons:

- Current formation historically experienced losses.
- Similar wells had losses at this depth.
- ECD increased recently.
- Offset similarity score is high.

---

# 10.21 Real-Time Prediction Workflow

During live drilling:

Telemetry arrives

↓

Feature extraction

↓

ML model inference

↓

Risk probability generated

↓

Historical comparison

↓

AI explanation generated

↓

Dashboard updated

---

# 10.22 Risk Scoring Formula

The final risk score should combine:

ML probability

Historical frequency

Similarity score

Severity factor

Example:

Final Risk Score:

86%

Components:

ML:

78%

Historical frequency:

High

Similarity:

91%

---

# 10.23 Risk Levels

Convert score into:

Low Risk

Medium Risk

High Risk

Critical Risk

---

# 10.24 Prediction API

Create:

POST

/api/ml/predict

Input:

well_id

telemetry_data

Output:

risk predictions

---

# 10.25 Batch Analysis API

Create:

GET

/api/ml/well-analysis/{well_id}

Returns:

Historical risks

Predicted risks

Model explanation

---

# 10.26 ML Dashboard

Create:

/analytics/ml

Display:

Model performance

Prediction frequency

Risk distribution

Feature importance

---

# 10.27 Feature Importance Visualization

Display:

Which parameters contribute most.

Example:

Lost circulation model:

Formation type

ECD

Offset history

Mud weight

---

# 10.28 Future ML Expansion

Architecture should support:

Deep learning

LSTM telemetry models

Transformer models

Physics-informed models

---

# 10.29 ML Completion Criteria

The ML system is complete when:

The platform can:

Train models.

Predict drilling risks.

Explain predictions.

Display confidence.

Combine ML with historical intelligence.

---

# PART 11

# COMPLETE DEVELOPMENT ROADMAP AND EXECUTION PHASES

The AI agent must implement the entire project in controlled phases.

Do not skip phases.

---

# PHASE 1

# Foundation Setup and Architecture

Objectives:

Create the complete development foundation.

Implement:

Repository structure

Frontend setup

Backend setup

Docker environment

Database connection

Authentication skeleton

Basic sidebar layout

Create:

React application

FastAPI application

PostgreSQL database

TimescaleDB extension

pgvector extension

Completion requirement:

The project starts successfully.

Database connects.

Frontend loads.

Login page works.

Stop after completion.

---

# PHASE 2

# Database, Synthetic Dataset and Core Backend

Objectives:

Create realistic petroleum data foundation.

Implement:

Database migrations

All core tables

Synthetic dataset generator

CSV generation

Database seeding

Seed:

Basins

Fields

100+ wells

Wellbores

Formations

Events

Mitigations

Lessons learned

Implement:

Well APIs

Field APIs

Search APIs

Completion requirement:

The database contains realistic petroleum knowledge.

Stop after completion.

---

# PHASE 3

# GIS Platform and Well Intelligence

Objectives:

Build map-based intelligence.

Implement:

Interactive map

Field boundaries

Dashed field circles

Well markers

Status legends

Well selection

Well detail panel

Add:

Filters

Search

Offset well visualization

Completion requirement:

User can explore Indian wells visually.

Stop after completion.

---

# PHASE 4

# Document AI and Knowledge System

Objectives:

Create institutional memory.

Implement:

Document upload

Hash detection

Page processing

Qwen2.5-VL integration

Markdown conversion

Entity extraction

Embeddings

RAG search

Completion requirement:

Uploaded documents become searchable AI knowledge.

Stop after completion.

---

# PHASE 5

# Live Rig Intelligence and AI Assistant

Objectives:

Create operational intelligence.

Implement:

Telemetry simulator

Automatic mode

Custom mode

WebSocket streaming

Live depth visualization

Formation tracking

Risk display

Offset incidents

Implement:

Drilling Assistant

Chat history

Context selection

Source citations

Completion requirement:

Complete live drilling intelligence workflow.

Stop after completion.

---

# PHASE 6

# ML Prediction, Reports and Final Polish

Objectives:

Complete advanced intelligence.

Implement:

ML models

Risk prediction

Explainable results

PDF reports

DOCX reports

Analytics dashboard

Final UI refinement

Completion requirement:

Full SIH-ready product demonstration.

Stop after completion.

---

# FINAL QUALITY CHECKLIST

Before declaring project complete, verify:

## Architecture

✔ Modular backend

✔ Clean frontend

✔ Database migrations

✔ Documentation

---

## AI

✔ OpenRouter support

✔ Ollama Qwen2.5-VL support

✔ RAG

✔ Source citations

---

## Data

✔ 100+ wells

✔ Multiple Indian basins

✔ Realistic relationships

✔ Telemetry history

---

## Intelligence

✔ Offset wells

✔ Historical incidents

✔ Future risk prediction

✔ Mitigation recommendations

---

## User Experience

✔ Apple-inspired light design

✔ Collapsible sidebar

✔ No gradients

✔ No emojis

✔ Lucide icons

✔ Responsive layouts

---

## Reports

✔ PDF generation

✔ DOCX generation

✔ Evidence references

---

# PART 9

# REPORT GENERATION SYSTEM, API ARCHITECTURE AND SECURITY

# 9.1 Purpose of Reporting System

The reporting system converts NWIS intelligence into professional operational documents.

The purpose is to eliminate manual preparation of drilling analysis reports.

A drilling engineer should be able to generate a complete intelligence report within seconds.

---

# 9.2 Supported Report Formats

The system must generate:

## PDF

Use:

ReportLab

---

## DOCX

Use:

python-docx

---

# 9.3 Report Types

Implement multiple report templates.

## Report Type 1

# Active Well Intelligence Report

Purpose:

Provide complete analysis of an active drilling operation.

---

## Report Type 2

# Offset Well Analysis Report

Purpose:

Compare current well with historical nearby wells.

---

## Report Type 3

# Field Intelligence Report

Purpose:

Provide field-level operational overview.

---

## Report Type 4

# Management Summary Report

Purpose:

Provide high-level operational insights.

---

# 9.4 Report Design Philosophy

Reports must look like professional petroleum engineering documents.

Requirements:

Clear structure

Technical accuracy

Readable tables

Professional formatting

Evidence references

Avoid:

Marketing style

Decorative elements

Excessive graphics

---

# 9.5 Report Header

Every page must contain:

eRTMAC-NWIS

Nearby Wells Intelligence System

Oil India Limited

Logo placeholder

---

# 9.6 Report Footer

Include:

Generated by:

eRTMAC-NWIS AI Platform

Generated date

Page number

---

# 9.7 Cover Page

Every report should contain:

Report title

Well name

Field

Basin

Date

Prepared user

System version

---

# 9.8 Executive Summary Section

The first section should summarize:

Current drilling status

Current depth

Formation

Detected risks

Recommended actions

Example:

"The current operation is drilling through Barail Formation at 3400m MD. Historical offset analysis identified similar lost circulation events in nearby wells."

---

# 9.9 Well Information Section

Include:

Well Details Table

Fields:

Well Name

Well ID

Field

Basin

Block

Latitude

Longitude

Purpose

Status

Trajectory

---

# 9.10 Drilling Status Section

Include:

Current depth

Target depth

Current operation

Current formation

---

# 9.11 Telemetry Analysis Section

Include:

Charts:

Depth vs Time

ROP trend

Torque trend

Pressure trend

ECD trend

---

# 9.12 Offset Well Section

Display:

Nearby wells table.

Columns:

Well Name

Distance

Similarity Score

Formation Match

Historical Events

---

# 9.13 Incident Analysis Section

Every incident should show:

Well

Depth

Formation

Event Type

Severity

NPT

Mitigation

---

# 9.14 Risk Intelligence Section

Display predicted future problems.

Every risk must include:

Risk type

Depth interval

Formation

Probability

Confidence

Historical frequency

Similarity score

Severity

---

# 9.15 AI Recommendation Section

Display:

Recommended action

Reason

Historical evidence

---

# 9.16 Source Evidence Section

Every AI-generated recommendation must include:

Document:

DDR_Duliajan_12.pdf

Page:

27

Related well:

Duliajan-08

Depth:

3400m-3500m

---

# 9.17 Report Builder UI

Create page:

/reports

Features:

View reports

Generate report

Download report

Delete report

---

# 9.18 Report Creation Workflow

User selects:

Report type

↓

Select well/field

↓

Select sections

↓

Generate report

↓

Backend processing

↓

Store file

↓

Display download

---

# 9.19 Report API

Create:

POST

/api/reports/generate

Request:

report_type

well_id

format

sections

Response:

report_id

status

file_path

---

# 9.20 Backend Architecture

The backend must be modular.

Recommended structure:

backend/

```
app/


    api/


    models/


    schemas/


    services/


    ai/


    ml/


    documents/


    reports/


    database/


    utils/
```

---

# 9.21 API Layer

Separate routers:

auth

users

wells

fields

documents

assistant

telemetry

risks

reports

analytics

---

# 9.22 Service Layer

Business logic must not exist inside routes.

Create services:

WellService

DocumentService

AIService

RiskService

TelemetryService

ReportService

---

# 9.23 Authentication System

Implement:

JWT authentication.

Workflow:

Login

↓

Validate credentials

↓

Generate token

↓

Access protected routes

---

# 9.24 Role Based Authorization

Every API endpoint must check permissions.

Example:

Admin:

Full access

Drilling Engineer:

Operational access

Management:

Read-only

---

# 9.25 Login Page Requirements

The prototype login page must contain:

Role selector

Available roles:

Admin

Drilling Engineer

Management

When role changes:

Automatically fill demo credentials.

Example:

Selected role:

Drilling Engineer

Auto-filled:

email

password

The user can login immediately.

---

# 9.26 Security Requirements

Implement:

Password hashing

JWT expiration

Input validation

File validation

API authorization

---

# 9.27 API Documentation

Generate:

OpenAPI documentation.

Include:

Endpoint description

Request format

Response format

Authentication requirement

---

# 9.28 Error Handling

Every API should return:

Success response

Error response

Validation messages

---

# 9.29 Logging

Implement structured logging.

Track:

API requests

AI processing

Document failures

ML predictions

Errors

---

# 9.30 Completion Criteria

Reporting and backend systems are complete when:

Users can:

Generate professional reports.

Reports contain:

Well information

Historical knowledge

Risk prediction

AI recommendations

Evidence references

Backend provides:

Secure APIs

Documentation

Proper architecture