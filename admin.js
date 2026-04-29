// ========== VARIABLES GLOBALES ADMIN ==========
let produits = [];
let produitsFiltres = [];
let imageCount = 1;

// ========== GESTION DES IMAGES ==========
function ajouterChampImage() {
    if (imageCount < 5) {
        imageCount++;
        const container = document.getElementById('images-container');
        const newRow = document.createElement('div');
        newRow.className = 'image-upload-row';
        newRow.innerHTML = `
            <input type="url" class="image-input" placeholder="URL image ${imageCount}">
            <button type="button" onclick="this.parentElement.remove(); imageCount--;" class="btn-remove-image">-</button>
        `;
        container.appendChild(newRow);
    } else {
        alert('Maximum 5 images par produit');
    }
}

// ========== CHARGEMENT DES PRODUITS DEPUIS FIREBASE ==========
async function chargerProduits() {
    try {
        const querySnapshot = await getDocs(collection(window.db, "produits"));
        produits = [];
        querySnapshot.forEach((doc) => {
            produits.push({ id: parseInt(doc.id), ...doc.data() });
        });
        produits.sort((a, b) => a.id - b.id);
        produitsFiltres = [...produits];
        console.log('Produits chargés depuis Firebase:', produits.length);
        afficherProduits();
        mettreAJourStats();
    } catch (error) {
        console.error('Erreur chargement produits:', error);
        montrerNotification('❌ Erreur de connexion à Firebase', 'error');
        produits = [];
        produitsFiltres = [];
        afficherProduits();
    }
}

// ========== AFFICHAGE DES PRODUITS ==========
function afficherProduits() {
    const container = document.getElementById('produitsList');

    if (produitsFiltres.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 30px; color: #7f8c8d;">Aucun produit trouvé</p>';
        return;
    }

    container.innerHTML = produitsFiltres.map(p => {
        const imageSrc = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/80';

        return `
            <div class="produit-card">
                <img src="${imageSrc}" alt="${p.nom}" onerror="this.src='https://via.placeholder.com/80'">
                <div class="produit-info">
                    <h4>
                        ${p.nom}
                        ${p.promo ? '<span class="badge-promo">PROMO</span>' : ''}
                    </h4>
                    <div class="prix">${p.prix.toLocaleString()} FCFA</div>
                    <div class="stock">Stock: ${p.stock} | Note: ${p.note}/5</div>
                    <small>${p.description.substring(0, 60)}...</small>
                    <small>📸 ${p.images ? p.images.length : 0} image(s)</small>
                </div>
                <div class="actions">
                    <button class="btn-icon btn-edit" onclick="editerProduit(${p.id})" title="Modifier">✏️</button>
                    <button class="btn-icon btn-duplicate" onclick="dupliquerProduit(${p.id})" title="Dupliquer">📋</button>
                    <button class="btn-icon btn-delete" onclick="supprimerProduit(${p.id})" title="Supprimer">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// ========== STATISTIQUES ==========
function mettreAJourStats() {
    document.getElementById('total-produits').textContent = produits.length;
    const stockTotal = produits.reduce((acc, p) => acc + (p.stock || 0), 0);
    document.getElementById('total-stock').textContent = stockTotal;
    const promoTotal = produits.filter(p => p.promo).length;
    document.getElementById('total-promo').textContent = promoTotal;
    const valeurStock = produits.reduce((acc, p) => acc + ((p.prix || 0) * (p.stock || 0)), 0);
    document.getElementById('valeur-stock').textContent = valeurStock.toLocaleString() + ' FCFA';
}

// ========== SAUVEGARDE PRODUIT ==========
async function sauvegarderProduit() {
    const produitId = document.getElementById('produitId').value;

    const imageInputs = document.querySelectorAll('.image-input');
    const images = Array.from(imageInputs)
        .map(input => input.value.trim())
        .filter(url => url !== '');

    if (images.length === 0) {
        alert('Veuillez ajouter au moins une image');
        return;
    }

    const produit = {
        nom: document.getElementById('nom').value,
        description: document.getElementById('description').value,
        prix: parseInt(document.getElementById('prix').value),
        prixOriginal: parseInt(document.getElementById('prixOriginal').value) || parseInt(document.getElementById('prix').value),
        images: images,
        categorie: document.getElementById('categorie').value,
        promo: document.getElementById('promo').checked,
        marque: document.getElementById('marque').value || 'Générique',
        stock: parseInt(document.getElementById('stock').value) || 0,
        livraison: document.getElementById('livraison').value,
        note: parseFloat(document.getElementById('note').value) || 4.5,
        avis: 0
    };

    try {
        if (produitId) {
            const produitRef = doc(window.db, "produits", produitId);
            await updateDoc(produitRef, produit);
            montrerNotification('✅ Produit modifié avec succès');
        } else {
            const nouvelId = Date.now();
            await setDoc(doc(window.db, "produits", nouvelId.toString()), produit);
            montrerNotification('✅ Nouveau produit ajouté');
        }

        await chargerProduits();
        resetForm();
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        montrerNotification('❌ Erreur lors de la sauvegarde', 'error');
    }
}

// ========== ÉDITION PRODUIT ==========
function editerProduit(id) {
    const produit = produits.find(p => p.id === id);

    document.getElementById('produitId').value = produit.id;
    document.getElementById('nom').value = produit.nom;
    document.getElementById('description').value = produit.description;
    document.getElementById('prix').value = produit.prix;
    document.getElementById('prixOriginal').value = produit.prixOriginal;
    document.getElementById('categorie').value = produit.categorie;
    document.getElementById('promo').checked = produit.promo;
    document.getElementById('marque').value = produit.marque;
    document.getElementById('stock').value = produit.stock;
    document.getElementById('livraison').value = produit.livraison;
    document.getElementById('note').value = produit.note;

    const container = document.getElementById('images-container');
    container.innerHTML = '';

    if (produit.images && produit.images.length > 0) {
        produit.images.forEach((imgUrl, index) => {
            const newRow = document.createElement('div');
            newRow.className = 'image-upload-row';
            if (index === 0) {
                newRow.innerHTML = `
                    <input type="url" class="image-input" value="${imgUrl}" placeholder="URL image ${index + 1}" required>
                    <button type="button" onclick="ajouterChampImage()" class="btn-add-image">+</button>
                `;
            } else {
                newRow.innerHTML = `
                    <input type="url" class="image-input" value="${imgUrl}" placeholder="URL image ${index + 1}">
                    <button type="button" onclick="this.parentElement.remove(); imageCount--;" class="btn-remove-image">-</button>
                `;
            }
            container.appendChild(newRow);
        });
        imageCount = produit.images.length;
    }

    document.getElementById('form-icon').textContent = '✏️';
    document.getElementById('form-title').textContent = 'Modifier le produit';
    document.querySelector('.form-produit').scrollIntoView({ behavior: 'smooth' });
}

// ========== DUPLIQUER PRODUIT ==========
async function dupliquerProduit(id) {
    const produit = produits.find(p => p.id === id);
    const nouveauProduit = {
        ...produit,
        nom: produit.nom + ' (copie)',
        images: [...produit.images]
    };

    try {
        const nouvelId = Date.now();
        await setDoc(doc(window.db, "produits", nouvelId.toString()), nouveauProduit);
        montrerNotification('📋 Produit dupliqué');
        await chargerProduits();
    } catch (error) {
        console.error('Erreur duplication:', error);
        montrerNotification('❌ Erreur lors de la duplication', 'error');
    }
}

// ========== SUPPRIMER PRODUIT ==========
async function supprimerProduit(id) {
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
        try {
            await deleteDoc(doc(window.db, "produits", id.toString()));
            montrerNotification('🗑️ Produit supprimé');
            await chargerProduits();
        } catch (error) {
            console.error('Erreur suppression:', error);
            montrerNotification('❌ Erreur lors de la suppression', 'error');
        }
    }
}

// ========== FILTRES ==========
function filtrerProduits(recherche) {
    const terme = recherche.toLowerCase();
    produitsFiltres = produits.filter(p =>
        p.nom.toLowerCase().includes(terme) ||
        p.description.toLowerCase().includes(terme) ||
        p.marque.toLowerCase().includes(terme)
    );
    afficherProduits();
}

// ========== RÉINITIALISATION FORMULAIRE ==========
function resetForm() {
    document.getElementById('produitForm').reset();
    document.getElementById('produitId').value = '';

    const container = document.getElementById('images-container');
    container.innerHTML = `
        <div class="image-upload-row">
            <input type="url" class="image-input" placeholder="URL image 1" required>
            <button type="button" onclick="ajouterChampImage()" class="btn-add-image">+</button>
        </div>
    `;
    imageCount = 1;

    document.getElementById('form-icon').textContent = '➕';
    document.getElementById('form-title').textContent = 'Ajouter un nouveau produit';
}

// ========== EXPORT JSON ==========
function exporterJSON() {
    const dataStr = JSON.stringify({ produits }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'produits.json';
    a.click();
    montrerNotification('📥 Fichier JSON exporté');
}

// ========== SYNCHRONISATION ==========
async function synchroniserBoutique() {
    montrerNotification('🔄 Déjà synchronisé avec Firebase !');
}

// ========== NOTIFICATIONS ==========
function montrerNotification(message, type = "success") {
    const anciennesNotifications = document.querySelectorAll('.notification');
    anciennesNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.background = type === "error" ? "#e74c3c" : "#27ae60";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    const checkFirebase = setInterval(() => {
        if (window.db) {
            clearInterval(checkFirebase);
            chargerProduits();
        }
    }, 100);
});
