/*
  # Create markers table for location-based image sharing

  1. New Tables
    - `markers`
      - `id` (uuid, primary key)
      - `latitude` (double precision, required)
      - `longitude` (double precision, required)
      - `image_url` (text, required) - URL to the stored image
      - `caption` (text, required)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `markers` table
    - Add policies for authenticated users to:
      - Read all markers (for map display)
      - Insert their own markers
      - Update/delete only their own markers

  3. Storage
    - Create storage bucket for marker images
    - Set up RLS policies for image access
*/

-- Create markers table
CREATE TABLE IF NOT EXISTS markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  image_url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE markers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view markers"
  ON markers
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert markers"
  ON markers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own markers"
  ON markers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own markers"
  ON markers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for marker images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marker-images', 'marker-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Anyone can view marker images"
  ON storage.objects
  FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'marker-images');

CREATE POLICY "Authenticated users can upload marker images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'marker-images');

CREATE POLICY "Users can update own marker images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'marker-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own marker images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'marker-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_markers_updated_at
  BEFORE UPDATE ON markers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();