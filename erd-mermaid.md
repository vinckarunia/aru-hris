```mermaid

erDiagram

    CLIENTS {
        bigint id PK
        string name "UK, NN"
        string prefix "UK, NN"
        timestamp created_at
    }

    PROJECTS {
        bigint id PK
        bigint client_id FK
        string name "NN"
        string id_prefix "NN"
        int id_running_number "DEF 0"
        timestamp created_at
        note additional_note "UNIQUE(client_id, name)"
    }

    DEPARTMENTS {
        bigint id PK
        bigint project_id FK
        string name "NN"
        note additional_note "UNIQUE(project_id, name)"
    }

    WORKERS {
        bigint id PK
        string nik_aru
        string name "NN"
        string ktp_number "UK, NN"
        string kk_number
        string birth_place
        date birth_date
        enum gender "male|female"
        string phone
        string education
        string religion
        string tax_status
        text address_ktp
        text address_domicile
        string mother_name
        string npwp
        string bpjs_kesehatan
        string bpjs_ketenagakerjaan
        string bank_name
        string bank_account_number
        timestamp created_at
        note additional_note "Worker global identity. 1 worker max 1 ACTIVE assignment (partial unique planned)"
    }

    ASSIGNMENTS {
        bigint id PK
        bigint worker_id FK
        bigint project_id FK
        bigint department_id FK
        string employee_id
        string position
        date hire_date "NN"
        date termination_date
        enum status "active|contract expired|resign|fired|other"
        timestamp created_at
        note additional_note "UNIQUE(project_id, employee_id)"
        note additional_note "PARTIAL UNIQUE(worker_id) WHERE termination_date IS NULL"
        note additional_note "termination_date >= hire_date"
    }

    CONTRACTS {
        bigint id PK
        bigint assignment_id FK
        enum contract_type "Kontrak|Harian"
        enum pkwt_type "PKWT|PKWTT"
        int pkwt_number "CHK > 0, NN"
        date start_date "NN"
        date end_date
        int duration_months
        text evaluation_notes
        string file_path
        timestamp created_at
        note additional_note "UNIQUE(assignment_id, contract_number)"
        note additional_note "PARTIAL UNIQUE(assignment_id) WHERE end_date IS NULL"
        note additional_note "PKWTT => end_date NULL"
    }

    CONTRACT_COMPENSATION {
        bigint id PK
        bigint contract_id FK "UK"
        decimal base_salary "CHK >= 0"
        enum salary_rate "hourly|daily|monthly|yearly"
        decimal meal_allowance "DEF 0"
        decimal transport_allowance "DEF 0"
        enum allowance_rate "hourly|daily|monthly|yearly"
        decimal overtime_weekday_rate "DEF 0"
        decimal overtime_holiday_rate "DEF 0"
        enum overtime_rate "hourly|daily|monthly|yearly"
        note additional_note "1:1 with CONTRACTS"
    }

    FAMILY_MEMBERS {
        bigint id PK
        bigint worker_id FK
        enum relationship_type "spouse|child|parent|other relatives"
        string name "NN"
        string birth_place
        date birth_date
        string nik
        string bpjs_number
        note additional_note "No global unique on NIK (family member may become worker later)"
    }

    USERS {
        bigint id PK
        string name "NN"
        string email "UK, NN"
        string password "NN"
        enum role "SUPER_ADMIN|PIC|CLIENT|WORKER"
        bigint client_id FK
        bigint worker_id FK
        note additional_note "CLIENT role must have client_id"
        note additional_note "WORKER role must have worker_id"
    }

    REMINDERS {
        bigint id PK
        string related_type "NN"
        bigint related_id "NN"
        datetime remind_at "NN"
        enum status "pending|critical|done"
        note additional_note "Polymorphic relation (application-level integrity)"
    }

    DOCUMENTS {
        bigint id PK
        bigint worker_id FK
        enum type "KK|KTP"
        string file_path "NN"
        timestamp verified_at
    }

    CLIENTS ||--o{ PROJECTS : has
    PROJECTS ||--o{ DEPARTMENTS : has
    PROJECTS ||--o{ ASSIGNMENTS : has
    WORKERS ||--o{ ASSIGNMENTS : has
    ASSIGNMENTS ||--o{ CONTRACTS : has
    CONTRACTS ||--|| CONTRACT_COMPENSATIONS : has
    WORKERS ||--o{ FAMILY_MEMBERS : has
    WORKERS ||--o{ DOCUMENTS : has
    ASSIGNMENTS ||--o{ DOCUMENTS : has
    CLIENTS ||--o{ USERS : has
    WORKERS ||--o{ USERS : has