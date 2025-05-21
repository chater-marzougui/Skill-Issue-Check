import os
import json
import google.generativeai as genai
import time
from dotenv import load_dotenv
from PyPDF2 import PdfReader

load_dotenv()

# Configuration
API_KEY = os.getenv("API_KEY")
CHUNK_SIZE = 10  # Number of pages per chunk

# Initialize Gemini
genai.configure(api_key=API_KEY)

def split_pdf_into_chunks(pdf_path, chunk_size=CHUNK_SIZE):
    """Split a PDF into chunks of specified size."""
    print(f"Opening PDF: {pdf_path}")
    try:
        pdf = PdfReader(pdf_path)
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        
        chunks = []
        for i in range(0, total_pages, chunk_size):
            end_page = min(i + chunk_size, total_pages)
            chunk_text = ""
            
            print(f"Processing pages {i+1} to {end_page}")
            for page_num in range(i, end_page):
                page = pdf.pages[page_num]
                chunk_text += page.extract_text() + "\n\n"
            
            chunks.append({
                "start_page": i + 1,
                "end_page": end_page,
                "text": chunk_text
            })
            
        return chunks
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return []

def get_gemini_response(text, attempts=3, delay=5):
    """Get response from Gemini with retry logic."""
    prompt = f"""
Analyze the provided document in detail and extract the key concepts, definitions, and critical points necessary for a deep understanding of the course. Then, generate multiple-choice questions (MCQs), following the format below:
Questions should be clear, precise, and relevant to the document's content.
The answer choices (options) should include one correct answer and three plausible distractors.
The correct answer should be indicated with its index in the list.
Provide a brief yet informative explanation for each answer to reinforce understanding.
Ensure the questions cover various levels of cognition, including factual recall, comprehension, and application.
Structure the questions to promote critical thinking and not just rote memorization.
Use the following JSON format:
{{
    "session 1": [
        {{
            "question": "What was the approximate amount of global venture capital funding for startups in the third quarter of 2021?",
            "options": [
                "77 billion USD",
                "158 billion USD",
                "100 billion USD",
                "200 billion USD"
            ],
            "answer": 1,
            "explanation": "Global venture capital funding for startups in the third quarter of 2021 was about 158 billion USD."
        }},
        {{
            "question": "How many new unicorns emerged in the third quarter of 2021?",
            "options": [
                "37",
                "77",
                "200",
                "127"
            ],
            "answer": 3,
            "explanation": "In the third quarter of 2021, 127 new unicorns emerged."
        }}
    ]
}}
Make sure that:
The answers are zero-indexed.
Use the same language as the document.
The questions cover different sections of the document comprehensively.
The explanations reinforce key learnings and not just repeat the correct answer.
The difficulty level varies, including both basic and challenging questions.
And be sure to put the answer indexes in different places (Don't repeat the position of the correct answer).
Don't use phrases like "The document says" or "The text states" in the questions or explanations.
The reply should be in JSON format only, without any additional text or comments.
The reply should be in the same language as the document.

Here's the document to analyze:
{text}
"""
    
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    for attempt in range(attempts):
        try:
            response = model.generate_content(prompt)
            # Extract the JSON part from the response
            response_text = response.text
            
            # Find the first { and the last } to extract the JSON object
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                # Parse to validate it's proper JSON
                try:
                    json_data = json.loads(json_str)
                    return json_data
                except json.JSONDecodeError as e:
                    print(f"Invalid JSON response (attempt {attempt+1}/{attempts}):\n{json_str}\nError: {e}")
            else:
                print(f"No valid JSON found in response (attempt {attempt+1}/{attempts}):\n{response_text}")
                
        except Exception as e:
            print(f"Error calling Gemini API (attempt {attempt+1}/{attempts}): {e}")
        
        if attempt < attempts - 1:
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            # Increase delay for next retry
            delay *= 2
    
    print("Failed to get a valid response after multiple attempts")
    return {"error": "Failed to get a valid response from Gemini"}


def get_gemini_response_kaaniche(text, attempts=3, delay=5):
    """Get response from Gemini with retry logic."""
    prompt = f"""
transform the given text and fix typos into a json in this format.
Use the following JSON format:
{{
    "session 1": [
        {{
            "question": "question 1",
            "options": [
                "option  1",
                "option  2",
                "option  3",
                "option  4",
                "option  5"
            ],
            "answer": [1, 2],
        }},
        {{
            "question": "question 2",
            "options": [
                "option  1",
                "option  2",
                "option  3",
                "option  4",
                "option  5"
            ],
            "answer": [0, 3],
        }},
    ]
}}
Make sure that:
The answers are zero-indexed.
Use the same language as the text provided.
The reply should be in JSON format only, without any additional text or comments.
The reply should be in the same language as the document.
Here's the text to analyze:
{text}
"""
    
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    for attempt in range(attempts):
        try:
            response = model.generate_content(prompt)
            # Extract the JSON part from the response
            response_text = response.text
            
            # Find the first { and the last } to extract the JSON object
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                # Parse to validate it's proper JSON
                try:
                    json_data = json.loads(json_str)
                    return json_data
                except json.JSONDecodeError as e:
                    print(f"Invalid JSON response (attempt {attempt+1}/{attempts}):\n{json_str}\nError: {e}")
            else:
                print(f"No valid JSON found in response (attempt {attempt+1}/{attempts}):\n{response_text}")
                
        except Exception as e:
            print(f"Error calling Gemini API (attempt {attempt+1}/{attempts}): {e}")
        
        if attempt < attempts - 1:
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            # Increase delay for next retry
            delay *= 2
    
    print("Failed to get a valid response after multiple attempts")
    return {"error": "Failed to get a valid response from Gemini"}


def process_pdf_with_gemini(pdf_path, base_folder, courses_path):
    """Process PDF with Gemini and save results to a JSON file."""
    # Generate a default output filename based on the input PDF
    chunks = split_pdf_into_chunks(pdf_path)
    if not chunks:
        print("No chunks were created. Exiting.")
        return
    
    print(f"Created {len(chunks)} chunks")
    
    all_questions = {}
    
    for i, chunk in enumerate(chunks):
        print(f"\nProcessing chunk {i+1}/{len(chunks)} (pages {chunk['start_page']}-{chunk['end_page']})")
        
        # Get response from Gemini
        print(f"Sending text to Gemini (length: {len(chunk['text'])} characters)")
        response = get_gemini_response(chunk['text'])
        
        if "error" in response:
            print(f"Error in chunk {i+1}: {response['error']}")
            continue
            
        # Merge the response with the combined results
        for section, questions in response.items():
            section_key = f"{section} (p.{chunk['start_page']}-{chunk['end_page']})"
            all_questions[section_key] = questions
            print(f"Added {len(questions)} questions for {section_key}")
        
        # Brief pause between API calls
        if i < len(chunks) - 1:
            time.sleep(2)
    
    output_path = os.path.splitext(pdf_path.replace(' ', '_').lower())[0] + '.json'
    course_name = os.path.basename(pdf_path).replace('.pdf', '')
    # Save the combined results
    with open(base_folder+output_path, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
        
    manage_courses(base_folder+courses_path, new_course_name=course_name, new_course_filename=output_path)
    
    print(f"\nComplete! Saved results to {output_path}")
    print(f"Generated a total of {sum(len(q) for q in all_questions.values())} questions")
    

def process_kaaniche_with_gemini(text_ls, base_folder, courses_path):
    """Process PDF with Gemini and save results to a JSON file."""
    # Generate a default output filename based on the input PDF
    all_questions = {}
    i = 0
    for text in text_ls:
        print(f"\nProcessing chunk {i+1}/{len(text_ls)}")
        
        # Get response from Gemini
        print(f"Sending text to Gemini (length: {len(text)} characters)")
        response = get_gemini_response_kaaniche(text)
        
        if "error" in response:
            print(f"Error in chunk {i+1}: {response['error']}")
            continue
            
        # Merge the response with the combined results
        for section, questions in response.items():
            section_key = f"{section} (p.{i}-{i+1})"
            all_questions[section_key] = questions
            print(f"Added {len(questions)} questions for {section_key}")
        
        # Brief pause between API calls
        if i < len(text_ls) - 1:
            time.sleep(1)
        i += 1
    
    output_path = os.path.splitext(pdf_path.replace(' ', '_').lower())[0] + '.json'
    course_name = os.path.basename(pdf_path).replace('.pdf', '')
    # Save the combined results
    with open(base_folder+output_path, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
        
    manage_courses(base_folder+courses_path, new_course_name=course_name, new_course_filename=output_path)
    
    print(f"\nComplete! Saved results to {output_path}")
    print(f"Generated a total of {sum(len(q) for q in all_questions.values())} questions")
   

def manage_courses(courses_file_path, new_course_name=None, new_course_filename=None):
    # Load existing courses file
    try:
        if os.path.exists(courses_file_path):
            with open(courses_file_path, 'r', encoding='utf-8') as f:
                courses_data = json.load(f)
        else:
            # Create new courses data structure if file doesn't exist
            courses_data = {"courses": []}
            print(f"No courses file found at {courses_file_path}. Creating new courses file.")
    except Exception as e:
        print(f"Error loading courses file: {e}")
        courses_data = {"courses": []}
    
    # Add new course if name and filename are provided
    if new_course_name and new_course_filename:
        # Find the highest existing ID to generate a new one
        existing_ids = [int(course["id"]) for course in courses_data.get("courses", [])]
        new_id = str(max(existing_ids, default=0) + 1)
        
        # Create new course entry
        new_course = {
            "id": new_id,
            "filename": new_course_filename,
            "name": new_course_name
        }
        
        # Add to courses list
        courses_data.setdefault("courses", []).append(new_course)
        print(f"Added new course: {new_course_name} (ID: {new_id})")
        
        # Save updated courses file
        try:
            with open(courses_file_path, 'w', encoding='utf-8') as f:
                json.dump(courses_data, f, indent=2, ensure_ascii=False)
            print(f"Courses file updated successfully at {courses_file_path}")
        except Exception as e:
            print(f"Error saving courses file: {e}")
    
    return courses_data

if __name__ == "__main__":
    # Get input from user
    base_folder = './assets/courses/'
    courses_path = 'course-list.json'
    pdf_path = 'Chapter 4-Next Generation Firewalls and Applications Identification.pdf'
    # Process the PDF
    texts = [
        """
1. Le Web 3.0... (choisir 2 réponses)
a.
permet de lire, d'écrire et d'exécuter des ressources web
b.... permet de lire et d'écrire des ressources web 
c. ... se focalise sur la compréhension sémantique des ressources web
d. ... se focalise sur les aspects syntaxiques des
ressources web
e. se focalise sur la dimension sociale en promouvant la communication et le partage d'information.
2. HTTP est... (choisir 3 réponses)
a. ... le protocole régissant l'envoi des courriels 
b...le protocole permettant le transfert des ressources web entre clients et serveurs 
c...l'acronyme d'Hypermedia Transfer Protocol 
d...l'acronyme d'Hypertext Transfer Protocol 
e..un protocole de communication half-duplex 
3. Le protocole HTTP/2.0... (choisir 2 réponses) 
a... est protocole échangeant des données sous format binaire.
b. ... est protocole échangeant des données sous format textuelle.
c. qui utilise le multiplexage de plusieurs requêtes HTTP sur une même connexion TCP
d.... qui traite chaque requête http-via une connexion TCP indépendante.
e. ... utilise le protocole UDP pour le transport de données.
4. HTML 5 est... (choisir 2 réponses)
a. ... un langage de scripts pour la programmation événementielle.
b. . un langage de balisage conçu pour représenter la structure des pages web.
c. ... un protocole de communication full-duplex. 
d...est l'acronyme de « HyperText Markup Language 5 »
e. ... est l'acronyme de << HyperMedia Messaging Layer 5 »
5. Une URI... (choisir 3 réponses)
a. . identifie les localisations physiques dans les réseaux des ressources web
b... identifie les noms logiques des ressources web
c. ... identifie les ayants droits et les métadonnées des ressources web
d. ... est l'acronyme de « Unique Resource Identity> 
e. .. est l'acronyme de « Uniform Resource Identifier> 
6. CSS 3 est... (choisir 2 réponses)
a... un langage permettant de spécifier la présentation des documents HTML 5 sur des différents types d'écrans.
b. ... un langage de description des politiques de sécurité. 
c. .xl'acronyme de « Cascading Style Sheets 3 >> 
d.... .l'acronyme de « Cyber Security Service 3 >>
e... un protocole assurant la confidentialité et l'authentification pour les services web.
7. JavaScript est... (choisir 3 réponses)
a. .un langage de scripts pour la programmation événementielle.
b. ... un utilitaire d'orchestration pour le langage Java.
c. 4. un langage orienté objet à prototype.
d.... langage de balisage conçu pour représenter la structure des pages web.
e. X, utilisé entre-autres pour programmer l'aspect dynamique des interfaces web définies par HTML5 et CSS 3
8. TypeScript est... (choisir 2 réponses)
a. ... un langage de scripts concurrent de JavaScript 
b. .x une surcouche fortement typée de JavaScript 
c... un langage compilé
d... un langage interprété
e.... un langage semi-compilé 
9. XML est... (choisir 3 réponses)
a. . l'unique format de données supporté par les services SOAP.
b. . un méta-langage permettant de définir plusieurs formats de données textes.
c. ... l'acronyme d'<Extensible Macro Language > 
d. l'acronyme d'<< Extensible Markup Language > 
e. ... un langage de scripts pour la programmation d'agents intelligents.
10.JSON est... (choisir 2 réponses)
a. ... l'acronyme de << Java Simple Object Notation » 
b. l'acronyme de « JavaScript Object Notation » 
c.... un type de jetons pour gérer les droits d'accès 
d. .x un format de données
e.... un langage de description de données 
11.La balise permettant d'activer le Responsive Web Design est:
a. La balise «link» avec un attribut «rel ayant pour valeur rwd>> incluse dans la balise <head>
b. La balise «link» avec un attribut «rel ayant pour valeur "rwd incluse dans la balise <body> 
c. La balise <meta> avec un attribut <<name> ayant pour valeur «viewport» incluse dans la balise <head>
d. La balise <meta> avec un attribut "name" ayant pour valeur <<viewport» incluse dans la balise <body>
e. La balise meta» avec un attribut "rwd>> ayant pour valeur <viewport incluse dans la balise<head>
12.La règle de style « #hi (...) concerne...
a. ... des balises ayant un attribut«< class >> dont la valeur est << hi».
b... des balises ayant un attribut << style » dont la valeur est << hi».
c. ...de la balise ayant un attribut«< id» dont la valeur est << hi».
d. ... des balises ayant un attribut « lang » dont la valeur est << hi».
e. ... des balises ayant un attribut xml::lang >> dont la valeur est << hi».
    """,
    """
    
13.Une Single Page Application... (choisir 2 réponses) 
a. . charge sa page principale et les ressources web associées d'une manière asynchrone 
b.... charge sa page principale et les ressources web associées d'une manière synchrone
c... charge les pages secondaires et les ressources web associés d'une manière synchrone
d... charge les pages secondaires et les ressources web associées en suivant de simples liens hypertextes depuis la page principale 
e.. charge les pages secondaires et les ressources web associées d'une manière dynamique et asynchrone.
14.Dans une SPA,... (choisir 3 réponses)
a. la gestion de l'historique de navigation et le référencement des pages secondaires sont brisés
b.... la gestion des notifications push et le formatage des pages secondaires des sont brisés
c. ... il est interdit de recharger la page principale 
d.. il est possible de recharger les pages secondaires
e. un unique Document Object Model est manipulé
15.Dans le patron de conception MVP... (choisir 2 réponses)
a. ... la Vue gère la communication entre les Présentateur et le Modèle
b. le Présentateur gère la communication entre le Modèle et la Vue
c.... le Modèle peut déclencher un événement de type Data Update » et une Vue peut déclenche un événement de type = UI/UX Action >
d. le Modèle peut déclencher un événement d type State Change » et une Vue peut déclenche un événement de type User Intent.
e... le Modèle peut déclencher un événement d type Modification Trigger et une Vue peu déclencher un événement de type Actic Trigger
16.Pour un service REST: (choisir 3 réponses) 
a. L'URI identifie une ressource
b. La méthode POST» est interdite sur une UR représentant une entité unique.
c. Le protocole utilisé peut-être quelconque. 
d. Les méthodes PUT et DELETE son fortement déconseillées pour une URI identifiant une collection.
e. La communication se fait avec états (Stateful) 
17.Les services REST sont: (choisir 2 réponses) 
a. Un ensemble de protocoles à respecter.
b. Un style architectural exploitant le concept d ressources.
c. Basés sur le protocole HTTP
d. Un ensemble d'API standards pour la connexion entr un serveur middleware et un back-end.
e. Dépendants du format de données XML qui doit êtr utilisé exclusivement lors des communications entr clients et serveurs.    
19.Le protocole MQTT...: (choisir 3 réponses)
a...peut être utilisé comme un sous-protocolo d'une WebSocket.
b. .. utilise le patron de communication Publish- Subscribe »
c.... utilise le patron de communication Push-Pull 
d... utilise le patron de conception Chaîne de responsabilité »
e. exige le protocole TCP au niveau transport. 
20.Dans le protocole MQTT, un Topic ... (choisir 3 réponses)
a. identifie un objet (p.ex. capteurs, actuateurs) ou un émetteur de messages (p.ex. REST API). 
b. ... identifie exclusivement des objets.
c. est hiérarchisé afin de pouvoir définir des catégories et des groupes.
d.... est un message qui est envoyé par un objet 
e. ...permet de définir un groupe de diffusion de messages.
21.Le protocole MQTT-SN... (choisir 2 réponses)
a utilise les mêmes identifiants que le protocole MQTT.
b. . est une version M2M du protocole MQTT s'affranchissant du protocole TCP
c... supporte les transferts de sons au format mp3 
d. Se connecte à un courtier (broker) MQTT via une passerelle (gateway) MQTT-SN
e.... peut être interfacé directement avec des services REST.
22.L'architecture WOA... (choisir 3 réponses)
a. utilise un <<load-balancer» pour répartir les charges entre plusieurs serveurs de ressources. 
b. ... utilise les services SOAP et les services REST
c. utilise exclusivement les services REST
d. repose sur la spécificité de la communication sans états des services REST
e.... permet aux clients d'accéder directement aux bases de données.
23. AJAX... (choisir 2 réponses)
a.... est l'acronyme de Advanced Java API for XML 
b... est l'acronyme de Asynchronous JavaScript And XML. 
c.... supporte uniquement le format de données XML 
d... permet la communication asynchrone entre clients et serveurs.
e.... permet la communication asynchrone entre serveurs et bases de données
24.EJB-MDB... (choisir 2 réponses)
a. est l'acronyme de Enterprise Java Beans - Message Driven Bean>
b.... est l'acronyme de Embedded JavaScript Beans-Message Driven Bean».
c.... est une API pour la sécurité et la stabilité des échanges entre clients et serveurs
d. ... est une API permettant la communication asynchrone entre clients et serveurs.
e. . est une API permettant la communication asynchrone entre serveurs et bases de données
    """,
    """
    
25.Les appels asynchrones... (cholar 3 réponses) 
a. ... sont bloquants pour l'émottour des appels. 
b. ... ont besoin d'enregistror uno fonction/méthodo dite do callback qui sora appelé lors de la réception de la réponse pour la traiter.
c. sont non bloquants pour l'émottour dos appels.
d.... assurent que los réponses arrivent dans lo momo ordre que colul des Invocations des appels.
e. N ont besoin d'un alguillour (dispatcher) pour gérer les réponses et les méthodes « callbacks qui y sont associés.
26.JAX-RS...
a. ... est l'API JavaScript pour les services SOAP 
b... est l'API Java pour les services SOAP 
c... est l'API JavaScript pour les servicos REST 
d. est l'API Java pour les services REST
e.... est l'implémentation de l'architecture oriontóo web en Java
27.Lequel de ces codes HTTP correspond au statut de succès - OK»:
a. 101
b. 200
c. 201
d. 401 
e. 403
28.Lequel de ces codes HTTP correspond au statut d'accès interdit. Forbidden»:
a. 101
b. 200
c. 201
d. 401
e. 403
29.Lequel de ces codes HTTP correspond au statut d'accès non autorisé « Unauthorized » :
a. 101
b. 200
c. 201
d. 401
e. 403
30.Pour un service REST, quel code http doit-on retourner en réponse à une requête POST sur une URI de collection?
a. 101
b. 200
c. 201 
d. 401 
e. 403
31.Quel code HTTP est retourné à la suite d'un handshake WebSocket:
a. 100
b. 1010
c. 102
d. 500
e. 503
#2.Quel est la meilleure requête pour changer un mot
de passe via une REST API:
a. PUT/users/{userid}/{oldpwd}/{newpwd) 
b. PATCH/users/(userid}/{oldpwd)/(newpwd)
c. PUT/users/{userid)/(oldpwdhash)/(newpwdhash) 
d. PATCH/users/{userid}/{oldpwdhash)/(newpwdhash) 
e. POST/users/(userid)/(oldpwdhash)/(newpwdhash}
    """,
    """
    
33.Quel annotation JAX-RS permet de lier et correspondre la valour d'un paramètre d'une méthode avec la valour d'un champ de formulaire ? 
a. @CookleParam
b. @PathParam 
c. @DefaultValue 
d. @FormParam 
e. @Context
34.Laquelle de ces méthodes HTTP doit être utilisé pour modifier partiellement une ressource?
a. GET
b. POST
o. PUT
d. DELETE
e. PATCH
35.Laquelle de cos annotations JAX-RS permet de définir un service REST
a. @PathParam
b. @Context
c. @Uriinfo
d. @Path
e. @ApplicationPath
36.Quel nom porte l'API JavaScript permettant de manipuler le contenu d'un document HTML 5
a. PKCS11
b. I18n
c. browsingData
d. DOM
e. Fetch
37.Quelle API JavaScript permet d'effectuer des communications asynchrones avec le serveur ?
a. PKCS11
b. i18n
c. browsingData
d. DOM
e. Fetch
38.Pour un service REST, la méthode HTTP OPTIONS sert à :
a. Récupérer les méthodes http applicables à la
ressource.<<
b. Afficher les sous-ressources disponibles.
c. Ajouter une métadonnée à une ressource.
d. Déterminer les prérequis (notamment le CORS) pour accéder à la ressource.
e. Savoir si une ressource est disponible.
39. Pour un service REST, la méthode HTTP HEAD sert à : 
a. Récupérer les méthodes http applicables à la
ressource.
b. Récupérer un aperçu HTML 5 (snapshot) d'une ressource.
c. Consulter les métadonnées d'une ressource, 
d. Consulter le contenu d'une ressource.
e. Savoir si une ressource est disponible. 
40.Pour les services REST, le code à la demande... (choisir 3 réponses)
a. permet d'exécuter côté client un code Contextuelle téléchargé depuis le serveur à la demande du client.
b. ... permet d'exécuter sur le serveur du code envoyé par le client.
c.... est obligatoire.
d.est optionnelle.
e.. allège la charge des serveurs ressources.
41.Pour les services REST, lo mash-up... (choisir 2 réponses)
a. ... recoupe les informations issues de plusieurs sources hétérogènes
b. permet l'agrégation de plusieurs services REST par un service REST global.
c. est l'agrégation côté client des différents services REST
d.... nécessite un niveau de granularité fort: micro-services.
e... permet l'accès direct du client aux back-ends (p.ex. bases de données, passerolles loT) 
42.Pour les services REST, le HATEOAS ...(choisir 2 réponses)
a. est l'acronyme de Hypertext API To Enhance the Opacity Application State.
b. exige que les ressources soient structurées sous la forme d'une arborescence dont les nœuds sont reliés par des liens hypertextes.
c. exige que les communications solent sans états.
d... est l'acronyme de Hypermedia As The Engine Of Application State
e. ... exige l'encapsulation des données.
43.Laquelle de ces annotations JAX-RS doit annoter la classe d'activation des services REST afin de définir la racine des ressources:
a. @PathParam
b. @Context
c. @Uriinfo
d. @Path
e. @ApplicationPath
44.Le protocole OAuth 2.0...
a... définit une méthode de délégation d'autorisation sans états pour les services REST 
b. définit une méthode d'authentification complète. 
c....nécessite un serveur d'authentification séparés des serveurs ressources afin de préserver la communication sans états.
d.... assure la confidentialité des données échangées.
e. est complémenté par « OpenID Connect » qui lui ajoute une couche d'identification. 
45.L'authentification par mot de passe... (choisir 3 réponses)
a. ... nécessite uniquement un hachage coté client
b.. nécessite un double hachage avec sel statique coté client et un sel aléatoire généré au moment de l'enregistrement coté serveur 
c. est vulnérable aux attaques par force brute avec tables arc-en-ciel 
d.... nécessite un chiffrement du mot de passe avec un algorithme de chiffrement asymétrique avant le stockage des mots de passes dans les bases de données d'authentification.
e. n'est vraiment effective que si des mots de passe forts et des authentifications à deux facteurs sont utilisés.
46. Lors du hachage d'un mot de passe... (choisir 2 réponses)
a... une fonction de hachage quelconque peut être utilisé.
b... uno fonction de hachage de type SHA 256 pout être utiliséo côté serveur.
c.une fonction de dérivation de clé de type Argon2 doit tro utilisé côté serveur.
d.uno fonction de hachage de type SHA 256 pout otro utilisée côté client.
e.... une fonction de dérivation de clé de type Argon2 doit être utilisée côté client.
    """,
    """
47.La blométrie... (choisir 3 réponses)
a. p. se déroule en deux phases: L'enrôlement et la vérification.
b. utilise lo protocolo de dissociation et le chiffroment asymétrique pour protéger le stockage des données relatifs aux traits blométrique.
c.... est un moyen d'authentification moins sécurisé que l'authentification par mot de passe. 
d. est l'authentification par reconnaissance des traits biologiques distinctifs des individus. 
e. utilise le protocole de Juels & Wattenberg. (fuzzy extractor) ainsi que les algorithmes de chiffrement homomorphes pour sécuriser le stockage des données relatifs aux traits biométrique.
48.Pendant une authentification par biométrie... (choisir 3 réponses)
a. il y a extraction d'un échantillon numérique d'un trait biométrique à l'enrôlement et à la vérification.
b. ... l'échantillon numérique est stockée sous sa forme brute.
c... un modèle mathématique invariant aux transformations géométriques est paramétré par l'échantillon numérique lors de l'enrôlement. 
d.... la vérification s'effectue en comparant l'échantillon numérique capturé par rapport à celui sauvegardé lors de l'enrôlement sous leur forme brute.
e. la vérification s'effectue en testant si l'échantillon numérique capturé est compatible avec le modèle mathématique paramétré lors de l'enrôlement.
49.TLS est... (choisir 2 réponses)
a. ... l'acronyme de Transfer Layer Secure 
b.un protocole assurant la confidentialité 
c.... un protocole de la couche réseaux 
d.... un protocole assurant la non-répudiation
e. A l'acronyme de Transport Layer Security 
50.... est un protocole réputé sécurisé en 2021 
a. TLS 1.0
b. TLS 1.1 
c. TLS 1.2
d. TLS 1.3
e. SSL 3
51.... est considérée comme suite cryptographique sécurisée en 2021 (choisir 2 réponses)
a. TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384 
b. TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384<<
c. TLS_DHE_RSA_WITH_AES_128_GCM_SHA256
d. TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
e. TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384
    
52. Dans la suite cryptographique TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384, l'acronyme ECDHE désigne...
a. l'algorithme d'échango de(s) clé(s) secréte(s) partagé(s)
b... l'algorithme d'authentification du serveur do chiffrer asymétriquement l'échange des clés
c.... l'algorithme do chiffrement symétriquo par bloc utilisé pour chiffrer to flux do donnéos par clé secrète  
d. ... l'algorithmo do code d'authentification do message (MAC) utilisé pour créer un condensat (ou empreinte ou hash) afin do vérifier l'intégrité de chaque bloc composant lo flux de données. 
e.... un identificateur do la suite cryptographique. cryptographique
53.Dans la suite cryptographique TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,l'acronymo RSA désigne...
a. ... l'algorithme d'échange de(s) clé(s) secréto(s) partagé(s)
b. ... l'algorithme d'authentification du serveur permettant de chiffrer l'échange des clós
asymétriquement
c... l'algorithme de chiffrement symétrique par bloc utilisé pour chiffrer le flux de données par clé secrète 
d.... l'algorithme de code d'authentification de message (MAC) utilisé pour créer un condensat (ou empreinte ou hash) afin de vérifier l'intégrité de chaque bloc composant le flux de données. 
e.... un identificateur de la suite cryptographique. 
54.Dans sulte cryptographique TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384, la chaîne de caractère AES 256 GCM désigne ...
a. ... l'algorithme d'échange de(s) clé(s) secrète(s) partagé(s)
b... l'algorithme d'authentification du serveur permettant de chiffrer asymétriquement l'échange des clés
c. l'algorithme de chiffrement symétrique par bloc utilisé pour chiffrer le flux de données par clé secrète 
d.... l'algorithme de code d'authentification de message (MAC) utilisé pour créer un condensat (ou empreinte ou hash) afin de vérifier l'intégrité de chaque bloc composant le flux de données. 
e.... un identificateur de la suite cryptographique. 
55.Dans suite cryptographique la TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384, la chaine de caractères SHA398 désigne ... 
a. ... l'algorithme d'échange de(s) clé(s) secrète(s) 
b... l'algorithme d'authentification du serveur permettant de chiffrer asymétriquement
l'échange des clés
c... l'algorithme de chiffrement symétrique par bloc utilisé pour chiffrer le flux de données par clé secrète
d. l'algorithme de code d'authentification de message (MAC) utilisé pour créer un condensat (ou empreinte ou hash) afin de vérifier l'intégrité de chaque bloc composant le flux de données. 
e. ... un identificateur de la suite cryptographique.
    """,
    """
    
56.Lorsqu'on configure le protocole TLS, la politique HSTS... (choisir 2 réponses)
a. and l'acronyme de HTTP Strict Transport Security 
b. ...permet de filtrer les trafics frauduleux 
c... Interdit l'accés en HTTPS
d. us déclare l'utilisation exclusive d'un accès sécurisé 
e. est l'acronyme de HTTP Strict Transfer Strategy
57.Lorsqu'on configure lo protocole TLS, pour activer la politique HSTS, Il faut configurer le serveur pour: 
a. Ajouter à chaque réponse HTTP, l'entête Strict-Transport-Security avec la valeur <<max-age=31536000; includeSubDomains>>.
b. Ajouter à chaque réponse HTTP, l'entête Strict-Transfer-Strategy avec la valeur <<max-age-31536000; includeSubDomains>>.
c. Ajouter à chaque réponse HTTP, l'entête Strict-Transfer-Strategy avec la valeur <<enabled>>
d. Ajouter à chaque réponse HTTP, l'entête Strict-Transport-Security avec la valeur <<enabled>>
e. Ignorer les connexions sur le port 80
58.JWT est... (choisir 2 réponses)
a. ... l'acronyme de Java Web Token
b... l'acronyme de JavaScript Web Token 
c. l'acronyme de JSON Web Token
d.... la concaténation de deux chaines de caractères encodés en base hexadecimale et séparés par des points.
e. la concatenation de trois chaînes de caractères encodés en base 64 et séparées par des points.
59.Un jeton JWT permet de: (choisir 3 réponses) 
a. Vérifier qu'il a été généré par le client à travers un mécanisme de signature <<
b. Représenter un ensembles réclamations (claims) à propos du client.
c.Vérifier qu'il a été généré par le serveur à travers un mécanisme de signature
d. Représenter un ensembles réclamations (claims) à propos du serveur.
e. Vérifier l'intégrité des réclamations à travers un mécanisme de signature <<
60.La signature d'un jeton JWT doit être généré par : 
a. Une fonction de hachage quelconque
b. Une fonction de hachage cryptographique 
c. Un algorithme de chiffrement asymétrique et une fonction de hachage cryptographique en signant avec la clé privée et en vérifiant la signature avec la clé publique.
d. Un algorithme de chiffrement asymétrique et une fonction de hachage cryptographique en signant avec la clé publique et en vérifiant la signature avec la clé privée.
e. Un algorithme de chiffrement symétrique, une fonction de hachage cryptographique et une fonction de recouvrement des hachées.
61.Un jeton JWT est... (choisir 2 réponses) 
a. ... généré à l'inscription d'un utilisateur.
b. ... généré à l'authentification d'un utilisateur. 
c  ... généré à la demande implicite du navigateur. 
d  ... sauvegardé dans la session au serveur. 
e. ... sauvegardé chez l'applicatif client.
62.Un Jeton JWT doit être envoyé...
a. ... avec chaque requête du client après l'authentification
b. avec chaque requête du client voulant accéder à une ressource sécurisée
c... avec chaque réponse du serveur avant l'authentification
d.... avec chaque réponse du serveur après l'authentification
e... avec chaque réponse du serveur à une requête voulant accéder à une ressource sécurisée
63. Un jeton JWT permet d'assurer: (choisir 2 réponses) 
a. L'authentification
b. L'autorisation et le contrôle d'accès 
c. La non-répudiation
d. L'intégrité des réclamations du jeton
e. L'intégrité des ressources échangées 
64.Un jeton JWT s'utilise 
a. Indépendamment du mécanisme d'authentification.
b. Avec un mécanisme d'authentification spécifique pour assurer la non-répudiation. 
c. Au cours de l'implémentation d'un mécanisme d'authentification pour assurer la sûreté de ce mécanisme.
d. Au cours de l'implémentation d'un mécanisme d'authentification pour assurer ultérieurement les autorisations et le contrôle d'accès.
e. Pour assurer la confidentialité des échanges. 
65.Un jeton JWT... (choisir 2 réponses)
a... est vérifié automatiquement par le serveur lorsqu'il est présent dans une requête du client 
b... est vérifié automatiquement par le client lorsqu'il est présent dans une réponse du serveur
c. fait partie des mécanismes de protection contre les attaques de type CSRF lorsqu'il est stocké dans la session storage
d... protège contre les attaques de type XSS lorsqu'il est stocké dans la session storage
e... nécessite que le client soit une application mobile.
66. Pour sécuriser un service REST, il faut et il suffit... 
a. ... d'utiliser le protocole TLS
b. ... d'utiliser les jetons JWT
c. ... d'utiliser le protocole TLS et les jetons JWT 
d. d'utiliser les services WS-Security
e. ... d'utiliser le protocole TLS, les jetons JWT et d'autres mécanismes dépendant de l'architecture WOA (Firewalls, IDS et Serveur d'Authentification et d'Autorisations mutualisé entre les différents serveurs gérant les ressources) 
67.Lorsque le protocole TLS est utilisé en association avec une WebSocket,... (choisir 2 réponses) 
a. I'URI de la WebSocket commence par "https://> 
b. I'URI de la WebSocket commence par «ws://> 
c. I'URI de la WebScoket commence par «wss://>< 
d.... le handshake TLS se fait avant le handshake WebSocket
e. ... le handshake TLS se fait après le handshake WebSocket
""",
"""
68.Dans JAX-RS, Quelle annotation permet de spécifier le type de données qu'accepte une requête ?
а. @Туре
b. @Produces
c. @Consumes
d. @RequestType
e. @ResponseType
69.Dans JAX-RS, Quelle annotation permet de spécifier le type de données que fournit une réponse?
a. @Type 
b. @Produces
c. @Consumes 
d. @RequestType
e. @ResponseType
70.Dans la Java API for WebSockets >, ... (choisir 2 réponses)
a. l'annotation<< @WebsocketServer» sur une classe POJO permet de définir la partie serveur d'une WebSocket
b....l'annotation <<@ServerEndpoint>> sur une classe POJO permet de définir la partie serveur d'une WebSocket 
c....l'annotation @OnReceive» sur une méthode d'une classe définissant la partie serveur d'une WebSocket permet de définir ce que fera la WebSocket lors de réception d'un message depuis la partie cliente.
d. l'annotation @OnMessage» sur une méthode d'une classe définissant la partie serveur d'une WebSocket permet de définir ce que fera la WebSocket lors de réception d'un message depuis la partie cliente. 
e... l'annotation @OnArrival » sur une méthode d'une classe définissant la partie serveur d'une WebSocket permet de définir ce que fera la WebSocket lors de réception d'un message depuis la partie cliente.
71.Dans la Java API for WebSockets », les annotations permettant de gérer le cycle de vie de la WebSocket sont:
a. @OnStart, @OnEnd, @OnLoss
b. @OnOpen, @OnClose, OnError 
c. @Started, @Ended, @Loss 
d. @Open, @Close, @Error
e. @Opened, @Closed, @Exception
72.Parmi les suites cryptographiques supportées par le protocole TLS 1.3, quelles sont celles effectivement supportées par le serveur d'application WildFly 23.0.2.Final? (choisir 2 réponses)
a. TLS_AES_256_GCM_SHA384 以
b. TLS_CHACHA20 POLY1305_SHA256 
c. TLS_AES_128_GCM_SHA256 
d. TLS_AES_128_CCM 8_SHA256 
e. TLS_AES_128_CCM_SHA256
73.Quel est le nom du gestionnaire de sécurité du serveur d'application WildFly 23.0.2.Final?
a. Zacefron
b. Thyratron 
c. Synchrotron 
d. Elytron 
e. Positron""",
    """
74. Par rapport à TLS 1.2, le protocole TLS 1.3 permet de... (choisir 3 réponses)
a....éliminer le support des algorithmes de hachages et de chiffrement symétrique réputés vulnérables.
b. ... supprimer le support d'anciens navigateurs 
c.... réduire le nombre de négociations lors du handshake
d.... supprimer le support d'échange (transport) de clés RSA pour assurer une confidentialité persistante parfaite.
e. ... modifier radicalement le processus d'échange de clés secrètes en choisissant un nouvel algorithme d'échange de clés Shanon-Turing 
75.Quel est le nom du serveur web du serveur d'application WildFly 23.0.2.Final?
a. ... Glasgow
b. ... Undertow 
C. ...Glashow
d. ... Rainbow
e.... Grybów
76.Dans JavaScript, pour sélectionner une balise HTML5 ayant un attribut << id >> avec la valeur << k», on peut utiliser : (choisir deux réponses)
a. let tag = document.getTagById('k')
b. let tag document.getElementById('k');
c. let tag= document.querySelector('k');
d. let tag = document.querySelector('#k');
e. let tag= document.querySelector('.k'); 
77.Dans JavaScript, pour sélectionner les balises HTML5 ayant une classe CSS3 «k»>, on peut utiliser: (choisir deux réponses)
a. let tags=document.getTagsByClass('k') 
b. let tags=document.getElementsByClassName('k');
c. let tags=document.querySelectorAll('k'); 
d. let tags=document.querySelectorAll('#k'); 
e. let tags=document.querySelectorAll('.k'); 
78.Dans JavaScript, pour sélectionner les balises ancres (i.e. anchors), on peut utiliser (choisir deux réponses)
a. let tags=document.getTags('a');
b. let tags document.getElementsByTagName ('a');
c. let tags=document.querySelectorAll('a'); 
d. let tags = document.querySelectorAll('#a'); 
e. let tags = document.querySelectorAll('a'):

79.Soit l'extrait de code HTML 5 suivant: 
<fieldset name="monsterSelection"> 
<legend>Choose your monster:</legend> 
<input type="radio" id="kraken" name="monster" /> 
<label for="kraken">Kraken</label><br/> 
<input type="radio" id="sasquatch" name="monster"/>
<label for "sasquatch">Sasquatch</label> <br/>
<input type="radio" id="mothman" name="monster"/>
<label for="mothman">Mothman</label> 
</fieldset>

Dans JavaScript, comment peut-on savoir quelle option a été choisie par l'utilisateur ?
a.document.querySelector("input[name="monster']:checked").value
b.document.querySelector ("filedset [nam-'monsterSelection'].value")
C.document.querySelector("input[type="radio"]:checked").value
d.document.querySelector("input[type='monster']:checked").getId()
e.document.querySelector("filedset[name="monsterSelection').click")
80.En considérant le code JavaScript suivant:
let tag = document.querySelector("aside > p");
Quel élément HTML 5 est sélectionné ?
a. Le dernier élément <p> dans le document ayant pour parent direct un élément <aside>
b. Le premier élément <p> dans le document ayant pour parent direct un élément <aside> 
c. Le dernier élément <p> dans le document ayant pour ancêtre un élément <aside>
d. Le premier élément <p> dans le document ayant pour ancêtre un élément <aside>
e. L'élément <p> suivant le premier élément <aside>
"""
    
    ]
    process_kaaniche_with_gemini(texts, base_folder, courses_path)