import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ofrybimftwriaxhfuljt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcnliaW1mdHdyaWF4aGZ1bGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQzMzgsImV4cCI6MjEwMjUzMDMzOH0.08EAHWn1t0UP0u90Mq4rBLwPLVGermSCJ1qVOvOJKrY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
