/* eslint-disable no-console */
import('firebase/app');

(async () => {
    try {
        const firebaseModule = await import('../src/firebase.js');
        const {
            db,
            collection,
            doc,
            getDocs,
            setDoc,
            serverTimestamp,
        } = firebaseModule;

        const copyCollection = async (source, target, transform) => {
            const snapshot = await getDocs(collection(db, source));
            if (snapshot.empty) {
                console.log(`[migracao] colecao ${source} vazia, nada a migrar.`);
                return;
            }
            await Promise.all(snapshot.docs.map(async (sourceDoc) => {
                const data = transform(sourceDoc.data());
                await setDoc(doc(db, target, sourceDoc.id), data, { merge: true });
            }));
            console.log(`[migracao] ${source} -> ${target} (${snapshot.size} documentos).`);
        };

        console.log('Iniciando migracao de dados das colecoes demo_* ...');

        await copyCollection('demo_clients', 'clients', (data) => ({
            name: data.name || '',
            cpf: data.cpf || '',
            phone: data.phone || '',
            email: data.email || '',
            vehicleBrand: data.vehicleBrand || '',
            vehicleModel: data.vehicleModel || '',
            vehicleYear: data.vehicleYear || '',
            vehiclePlate: data.vehiclePlate || '',
            createdAt: data.createdAt || serverTimestamp(),
        }));

        await copyCollection('demo_professionals', 'professionals', (data) => ({
            name: data.name || '',
            email: data.email || '',
            specialty: data.specialty || '',
        }));

        await copyCollection('demo_services', 'services', (data) => ({
            name: data.name || '',
            price: typeof data.price === 'number' ? data.price : 0,
            duration: typeof data.duration === 'number' ? data.duration : 60,
            commissionType: data.commissionType || 'percentage',
            commissionValue: typeof data.commissionValue === 'number' ? data.commissionValue : 0,
        }));

        await copyCollection('demo_appointments', 'appointments', (data) => ({
            ...data,
            status: data.status || 'agendado',
            vehicleBrand: data.vehicleBrand || '',
            vehicleModel: data.vehicleModel || '',
            vehiclePlate: data.vehiclePlate || '',
            partsCost: typeof data.partsCost === 'number' ? data.partsCost : 0,
            paymentMethod: data.paymentMethod || 'pix',
        }));

        await copyCollection('demo_transactions', 'transactions', (data) => ({
            ...data,
            totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : (typeof data.amount === 'number' ? data.amount : 0),
            serviceAmount: typeof data.serviceAmount === 'number' ? data.serviceAmount : (typeof data.totalAmount === 'number' ? data.totalAmount : (typeof data.amount === 'number' ? data.amount : 0)),
            partsCost: typeof data.partsCost === 'number' ? data.partsCost : 0,
            commission: typeof data.commission === 'number' ? data.commission : 0,
        }));

        await copyCollection('demo_yard', 'yard', (data) => ({
            ...data,
            status: data.status || 'recebido',
            priority: data.priority || 'normal',
        }));

        console.log('Migracao concluida. Revise os dados e remova as colecoes demo_* manualmente quando estiver tudo ok.');
        process.exit(0);
    } catch (error) {
        console.error('Erro durante a migracao:', error);
        process.exit(1);
    }
})();
