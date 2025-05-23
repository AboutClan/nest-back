import mongoose, { Document, Model, model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { z } from 'zod';

export const AnnouncementZodSchema = z.object({
  type: z.enum(ENTITY.ANNOUNCEMENT.ENUM_TYPE),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export type IAnnouncement = z.infer<typeof AnnouncementZodSchema> & Document;

export const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    type: {
      type: String,
      enum: ENTITY.ANNOUNCEMENT.ENUM_TYPE,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Announcement =
  (mongoose.models.Announcement as Model<IAnnouncement, {}, {}, {}>) ||
  model<IAnnouncement>(DB_SCHEMA.ACCOUNCEMENT, AnnouncementSchema);
