const KG_PHONE = /^\+996(\d{3})(\d{3})(\d{3})$/

export const formatPhone = (phone: string) => phone.replace(KG_PHONE, '+996 $1 $2 $3')
