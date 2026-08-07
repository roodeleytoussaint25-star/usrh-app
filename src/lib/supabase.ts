import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tzgssgfbbumvmzkaefnk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6Z3NzZ2ZiYnVtdm16a2FlZm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDYyOTIsImV4cCI6MjEwMTUyMjI5Mn0.fJV6YYFvvaP_EBW5jbnp9CdPXwG3prA9N-hlqdrHyBs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
