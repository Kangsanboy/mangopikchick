import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vrnnpcjbolaunwxufhgc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybm5wY2pib2xhdW53eHVmaGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDA2NzEsImV4cCI6MjA4MzUxNjY3MX0.feuf2A2DWCUtcDIjt1xg5BQpNRzcOxo0BrVifG3uSTM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import the supabase client like this:
// For React:
// import { supabase } from "@/integrations/supabase/client";
// For React Native:
// import { supabase } from "@/src/integrations/supabase/client";
