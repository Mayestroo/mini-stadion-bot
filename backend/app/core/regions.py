# Canonical regions of Uzbekistan for stadium filtering (single source of truth).
REGIONS: list[str] = [
    "Toshkent shahri",
    "Toshkent viloyati",
    "Andijon viloyati",
    "Buxoro viloyati",
    "Farg'ona viloyati",
    "Jizzax viloyati",
    "Xorazm viloyati",
    "Namangan viloyati",
    "Navoiy viloyati",
    "Qashqadaryo viloyati",
    "Qoraqalpog'iston Respublikasi",
    "Samarqand viloyati",
    "Sirdaryo viloyati",
    "Surxondaryo viloyati",
]

# The 12 districts of Toshkent shahri — also used by the migration backfill.
TASHKENT_DISTRICTS: list[str] = [
    "Yunusobod",
    "Chilonzor",
    "Yakkasaroy",
    "Mirzo Ulug'bek",
    "Mirobod",
    "Shayxontohur",
    "Olmazor",
    "Bektemir",
    "Sergeli",
    "Uchtepa",
    "Yangihayot",
    "Yashnobod",
]


def is_valid_region(value: str) -> bool:
    return value.strip() in REGIONS
