import { beforeEach, afterEach } from 'bun:test'
import { rm } from 'fs/promises'
import path from 'path'

// Test setup and teardown
beforeEach(async () => {
  // Clean up test directories before each test
  const testDirs = ['uploads', 'media']
  for (const dir of testDirs) {
    try {
      await rm(path.join(process.cwd(), dir), { recursive: true, force: true })
    } catch {
      // Ignore if directory doesn't exist
    }
  }
  
  // Also clean up config file
  try {
    await rm(path.join(process.cwd(), 'config.json'), { force: true })
  } catch {
    // Ignore if file doesn't exist
  }
})

afterEach(async () => {
  // Clean up after each test
  const testDirs = ['uploads', 'media']
  for (const dir of testDirs) {
    try {
      await rm(path.join(process.cwd(), dir), { recursive: true, force: true })
    } catch {
      // Ignore if directory doesn't exist
    }
  }
  
  // Also clean up config file
  try {
    await rm(path.join(process.cwd(), 'config.json'), { force: true })
  } catch {
    // Ignore if file doesn't exist
  }
})
