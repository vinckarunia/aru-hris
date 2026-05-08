import re

with open('resources/js/Pages/Worker/Import.tsx', 'r') as f:
    content = f.read()

# Replace imports/names
content = content.replace("export default function Import({ clients, projects, dbColumns, autoMapHints }: Props)", "export default function Import({ dbColumns, autoMapHints }: Props)")
content = content.replace("workers.import.", "internal-employees.import.")
content = content.replace("workers.index", "internal-employees.index")
content = content.replace("Data Karyawan", "Data Karyawan Internal")

# Remove Props we don't need
content = re.sub(r'    clients: Client\[\];\n    projects: Project\[\];\n', '', content)
content = re.sub(r'interface Client \{.*?\n\}\n\n/\*\* Represents a branch.*?\ninterface Branch \{.*?\n\}\n\n/\*\* Represents a project.*?\ninterface Project \{.*?\n\}\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'interface GlobalSettings \{.*?\n\}\n\n', '', content, flags=re.DOTALL)

# Remove globalSettings state
content = re.sub(r'    const \[globalSettings, setGlobalSettings\] = useState<GlobalSettings>\(\{.*?\}\);\n', '', content, flags=re.DOTALL)

# Remove RATE_OPTIONS and CONTRACT_TYPE_OPTIONS
content = re.sub(r'// ============================================================================\n// RATE OPTIONS\n// ============================================================================\n.*?// ============================================================================\n// MAIN COMPONENT\n// ============================================================================', '// ============================================================================\n// MAIN COMPONENT\n// ============================================================================', content, flags=re.DOTALL)

# Fix validate payload
content = content.replace("global_settings: globalSettings,\n", "")

# Fix process payload
content = content.replace("global_settings: globalSettings,\n", "")

# Remove validation block in handleValidate that checks for project/branch
validation_block = """        // Only require global project/department if not mapped from columns
        const hasProjectMapping = mapping['project_name'] !== undefined;
        const hasBranchMapping = mapping['branch_name'] !== undefined;

        if (!hasProjectMapping && !globalSettings.project_id) {
            alert('Silakan pilih Project di pengaturan global, atau mapping kolom "Nama Project" dari file.');
            return;
        }
        if (!hasBranchMapping && globalSettings.branch_ids.length === 0) {
            alert('Silakan pilih setidaknya satu Cabang di pengaturan global, atau mapping kolom "Nama Cabang" dari file.');
            return;
        }

        // If they mapped the project/branch name but didn't pick global Project/Branch ID,
        // they MUST pick a Client to allow auto-creation.
        if ((hasProjectMapping && !globalSettings.project_id && !globalSettings.client_id) ||
            (hasBranchMapping && globalSettings.branch_ids.length === 0 && !globalSettings.client_id)) {
            alert('Jika Anda melakukan mapping nama Project/Cabang dari CSV, silakan pilih setidaknya "Client" di Pengaturan Global agar sistem dapat membuatkannya secara otomatis jika tidak ditemukan.');
            return;
        }"""
content = content.replace(validation_block, "")

# Remove Global Settings UI block completely
# It starts at "Global Settings Panel" and ends before Step 3
global_settings_start = content.find("{/* Global Settings Panel")
step_3_start = content.find("{/* ================================================================\n                STEP 3: VALIDATION")
if global_settings_start != -1 and step_3_start != -1:
    content = content[:global_settings_start] + content[step_3_start:]

# Remove unused filteredProjects/Branches
content = re.sub(r'    /\*\* Get projects filtered.*?;', '', content, flags=re.DOTALL)
content = re.sub(r'    /\*\* Get branches filtered.*?;', '', content, flags=re.DOTALL)

# The preview data interface in ValidationResult
content = content.replace("        status: string;\n        hire_date: string | null;\n", "        status: string;\n        join_date?: string | null;\n        hire_date?: string | null;\n")

# Attr preview in table
content = content.replace("r.preview.hire_date", "(r.preview.hire_date || r.preview.join_date)")

with open('resources/js/Pages/InternalEmployee/Import.tsx', 'w') as f:
    f.write(content)

print("Done generating InternalEmployee/Import.tsx")
