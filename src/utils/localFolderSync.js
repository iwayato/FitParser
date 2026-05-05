import routeStorage from './routeStorage'
import { parseFitFile } from './fitParser'

const localFitFiles = import.meta.glob('../../files/*.fit', { query: '?url', import: 'default', eager: true })

export function getLocalFolderFileList() {
    return Object.entries(localFitFiles).map(([modulePath, assetUrl]) => {
        const fileName = modulePath.split('/').pop()
        return {
            modulePath,
            assetUrl,
            fileName,
            path: `files/${fileName}`,
        }
    })
}

export async function syncLocalFolderFiles() {
    const files = getLocalFolderFileList()
    const results = { imported: 0, skipped: 0, errors: [] }

    if (files.length === 0) {
        results.errors.push('No FIT files found in project /files folder. Add .fit files to /files and reload.')
        return results
    }

    for (const file of files) {
        try {
            console.log(`Processing ${file.fileName}...`)
            const alreadyExists = await routeStorage.routeExistsByPath(file.path)
            if (alreadyExists) {
                console.log(`Skipping ${file.fileName} - already imported`)
                results.skipped++
                continue
            }

            const response = await fetch(file.assetUrl)
            if (!response.ok) {
                console.error(`Failed to fetch ${file.fileName}: ${response.statusText}`)
                throw new Error(`Unable to fetch ${file.fileName}`)
            }

            const blob = await response.blob()
            const fitFile = new File([blob], file.fileName, { type: 'application/octet-stream' })
            const data = await parseFitFile(fitFile)

            if (data.points.length === 0) {
                results.errors.push(`${file.fileName} contains no data`)
                console.warn(`Skipping ${file.fileName} - no data points found`)
                continue
            }

            await routeStorage.saveRoute(data, file.fileName, file.path)
            console.log(`Imported ${file.fileName} successfully`)
            results.imported++
        } catch (error) {
            console.error(`Error processing ${file.fileName}:`, error)
            results.errors.push(`${file.fileName}: ${error.message}`)
        }
    }

    return results
}
