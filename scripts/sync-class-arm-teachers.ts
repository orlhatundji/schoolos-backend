import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration script to sync existing ClassArm.classTeacherId data to ClassArmTeacher table
 * This ensures that teachers who were assigned via the admin portal can mark attendance
 */
async function syncClassArmTeachers() {
  console.log('Starting sync of ClassArm.classTeacherId to ClassArmTeacher table...');

  try {
    // Find all ClassArm records with non-null classTeacherId
    const classArmsWithTeachers = await prisma.classArm.findMany({
      where: {
        classTeacherId: {
          not: null,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        classTeacherId: true,
      },
    });

    console.log(`Found ${classArmsWithTeachers.length} class arms with assigned teachers`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const classArm of classArmsWithTeachers) {
      // Check if ClassArmTeacher record already exists
      const existingRecord = await prisma.classArmTeacher.findFirst({
        where: {
          classArmId: classArm.id,
          teacherId: classArm.classTeacherId!,
          deletedAt: null,
        },
      });

      if (existingRecord) {
        console.log(`Skipping ${classArm.name} - ClassArmTeacher record already exists`);
        skippedCount++;
        continue;
      }

      // Create ClassArmTeacher record
      await prisma.classArmTeacher.create({
        data: {
          teacherId: classArm.classTeacherId!,
          classArmId: classArm.id,
        },
      });

      console.log(`Created ClassArmTeacher record for ${classArm.name}`);
      createdCount++;
    }

    console.log(`\nSync completed:`);
    console.log(`- Created: ${createdCount} records`);
    console.log(`- Skipped: ${skippedCount} records (already existed)`);
    console.log(`- Total processed: ${classArmsWithTeachers.length} class arms`);

  } catch (error) {
    console.error('Error during sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  syncClassArmTeachers()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { syncClassArmTeachers };
